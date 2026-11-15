// supabase/functions/emi-calculate-and-pay/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthenticatedClient, getServiceRoleClient } from '../_shared/supabaseClient.ts';
import { verifyUserIdentity, requireRole, AuthError } from '../_shared/auth.ts';
import { checkRateLimit, getClientIdentifier } from '../_shared/rateLimiter.ts';
import {
  parseJsonBody,
  validateUuid,
  validateNumber,
  validateEnum,
  validateString,
  ValidationError,
  sanitizeLogData,
} from '../_shared/validator.ts';

interface EmiCalculateRequest {
  action: 'calculate';
  principal: number;
  interestRate: number; // annual percentage, e.g. 9.5
  termMonths: number;
}

interface EmiPaymentRequest {
  action: 'record_payment';
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'UPI';
  reference?: string;
  notes?: string;
}

type EmiPayload = EmiCalculateRequest | EmiPaymentRequest;

/**
 * Mathematically calculates exact monthly EMI and amortization details:
 * EMI = [P x r x (1+r)^n] / [(1+r)^n - 1]
 */
export function calculateAmortization(
  principal: number,
  annualInterestRate: number,
  termMonths: number
) {
  if (principal <= 0 || termMonths <= 0) {
    throw new ValidationError('Principal and term months must be strictly positive.');
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  let monthlyEmi: number;
  let totalPayable: number;
  let totalInterest: number;

  if (monthlyRate === 0) {
    monthlyEmi = principal / termMonths;
    totalPayable = principal;
    totalInterest = 0;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    monthlyEmi = (principal * monthlyRate * factor) / (factor - 1);
    totalPayable = monthlyEmi * termMonths;
    totalInterest = totalPayable - principal;
  }

  return {
    principal: Math.round(principal * 100) / 100,
    annualInterestRate,
    termMonths,
    monthlyEmi: Math.round(monthlyEmi * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

export async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    // 1. Authenticate caller
    const authClient = getAuthenticatedClient(req);
    const { user: callerUser, profile: callerProfile } = await verifyUserIdentity(authClient, req);

    // 2. Authorize caller: Must have financial management clearance
    requireRole(callerProfile, ['Super Admin', 'Admin', 'Fleet Manager', 'Accountant']);

    // 3. Rate limiting: 40 calls / min
    const rateLimitKey = getClientIdentifier(req, callerProfile.id);
    const rateLimit = checkRateLimit(rateLimitKey, 40, 60000);
    if (!rateLimit.allowed) {
      return errorResponse(
        `Rate limit exceeded for finance transactions. Retry in ${rateLimit.resetSeconds}s.`,
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    const body = await parseJsonBody<EmiPayload>(req);
    const action = validateEnum(body.action, ['calculate', 'record_payment'] as const, 'action');

    // 4. Action: Calculate Exact EMI Amortization
    if (action === 'calculate') {
      const calcBody = body as EmiCalculateRequest;
      const principal = validateNumber(calcBody.principal, 'principal', 1, 100000000); // Max 10 Crore
      const interestRate = validateNumber(calcBody.interestRate, 'interestRate', 0, 50);
      const termMonths = Math.floor(validateNumber(calcBody.termMonths, 'termMonths', 1, 360));

      const amortization = calculateAmortization(principal, interestRate, termMonths);

      return jsonResponse({
        success: true,
        data: amortization,
      });
    }

    // 5. Action: Record Verified EMI Payment
    if (action === 'record_payment') {
      const payBody = body as EmiPaymentRequest;
      const loanId = validateUuid(payBody.loanId, 'loanId');
      const amount = validateNumber(payBody.amount, 'amount', 1, 5000000);
      const paymentDate = validateString(payBody.paymentDate, 'paymentDate', 8, 30);
      const paymentMethod = validateEnum(
        payBody.paymentMethod,
        ['Cash', 'Bank Transfer', 'Card', 'UPI'] as const,
        'paymentMethod'
      );
      const reference = payBody.reference ? validateString(payBody.reference, 'reference', 1, 100) : 'EMI-PMT';
      const notes = payBody.notes ? validateString(payBody.notes, 'notes', 0, 500) : '';

      const serviceClient = getServiceRoleClient();

      // Fetch loan from database
      const { data: loan, error: loanError } = await serviceClient
        .from('emi_loans')
        .select('*')
        .eq('id', loanId)
        .single();

      if (loanError || !loan) {
        return errorResponse('EMI loan record not found.', 'LOAN_NOT_FOUND', 404);
      }

      // Check tenant isolation
      if (callerProfile.role !== 'Super Admin' && loan.organization_id !== callerProfile.organization_id) {
        return errorResponse('Access denied: Unauthorized loan tenant.', 'TENANT_VIOLATION', 403);
      }

      // Check loan status
      if (loan.status === 'completed') {
        return errorResponse('Loan is already fully paid and completed.', 'LOAN_COMPLETED', 400);
      }

      // Prevent overpayment
      if (amount > loan.outstanding_balance) {
        return errorResponse(
          `Payment amount (₹${amount}) exceeds remaining outstanding balance (₹${loan.outstanding_balance}).`,
          'OVERPAYMENT_NOT_ALLOWED',
          400
        );
      }

      // Calculate updated balances
      const newTotalPaid = Math.round((loan.total_paid + amount) * 100) / 100;
      const newOutstanding = Math.max(0, Math.round((loan.outstanding_balance - amount) * 100) / 100);
      const newInstallmentsPaid = loan.installments_paid + 1;
      const newStatus = newOutstanding <= 0 ? 'completed' : loan.status;

      // 1. Insert EMI payment record
      const { data: paymentRecord, error: pmtInsertError } = await serviceClient
        .from('emi_payments')
        .insert({
          organization_id: loan.organization_id,
          loan_id: loan.id,
          installment_number: newInstallmentsPaid,
          due_date: loan.next_due_date,
          payment_date: paymentDate,
          amount,
          status: 'paid',
          reference,
          notes,
        })
        .select()
        .single();

      if (pmtInsertError) {
        throw new Error(`Failed to insert EMI payment: ${pmtInsertError.message}`);
      }

      // 2. Update loan record
      const { error: loanUpdateError } = await serviceClient
        .from('emi_loans')
        .update({
          total_paid: newTotalPaid,
          outstanding_balance: newOutstanding,
          installments_paid: newInstallmentsPaid,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loan.id);

      if (loanUpdateError) {
        throw new Error(`Failed to update loan balance: ${loanUpdateError.message}`);
      }

      // 3. Create double-entry expense ledger record in public.expenses
      await serviceClient.from('expenses').insert({
        organization_id: loan.organization_id,
        category: 'emi',
        type: 'expense',
        amount,
        date: paymentDate,
        description: `EMI Installment #${newInstallmentsPaid} for Loan ${loan.loan_id} (${loan.lender})`,
        bus_number: loan.bus_number,
        payment_method: paymentMethod,
        reference_number: reference,
      });

      // 4. Record audit log
      await serviceClient.from('audit_logs').insert({
        organization_id: loan.organization_id,
        user_id: callerUser.id,
        user_email: callerProfile.email,
        action: 'RECORD_EMI_PAYMENT',
        entity_type: 'EMI_LOAN',
        entity_id: loan.id,
        details: {
          installmentNumber: newInstallmentsPaid,
          amountPaid: amount,
          remainingBalance: newOutstanding,
          paymentMethod,
          recordedBy: callerProfile.email,
        },
      });

      console.info(
        `[AUDIT] EMI Payment ₹${amount} recorded for Loan ${loan.loan_id} by ${callerProfile.email}. Remaining: ₹${newOutstanding}`
      );

      return jsonResponse({
        success: true,
        message: `Payment of ₹${amount.toLocaleString()} successfully recorded for loan ${loan.loan_id}.`,
        data: {
          paymentId: paymentRecord?.id,
          loanId: loan.id,
          installmentNumber: newInstallmentsPaid,
          amountPaid: amount,
          remainingBalance: newOutstanding,
          status: newStatus,
        },
      });
    }

    return errorResponse('Invalid action specified.', 'INVALID_ACTION', 400);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.code, err.status);
    }
    if (err instanceof ValidationError) {
      return errorResponse(err.message, err.code, err.status);
    }

    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[EMI Edge Function] Unhandled Exception:', sanitizeLogData({ message: errorMsg }));
    return errorResponse('Failed to execute financial operation.', 'INTERNAL_FINANCE_ERROR', 500);
  }
}

// Default export for Deno / Supabase runtime
if (typeof Deno !== 'undefined' && 'serve' in Deno) {
  // @ts-ignore: Deno runtime typing
  Deno.serve(handler);
}
