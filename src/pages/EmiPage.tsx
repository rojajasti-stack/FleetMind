import React, { useState } from 'react';
import {
  CreditCard, Search, Plus, Download, CheckCircle, Clock,
  AlertTriangle, DollarSign, Calendar, Building2, Bus
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { EmiLoan } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate, calculateEmi } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const EmiPage: React.FC = () => {
  const { loans, addLoan, recordEmiPayment, buses } = useFleetData();

  const [search, setSearch] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<EmiLoan | null>(loans[0] || null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<EmiLoan | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Form State
  const initialFormState: Omit<EmiLoan, 'id'> = {
    loan_id: '',
    lender: 'HDFC Bank Commercial Vehicle Finance',
    bus_number: buses[0]?.bus_number || 'FM-101',
    principal_amount: 5000000,
    interest_rate: 8.5,
    loan_start_date: '2023-01-01',
    term_months: 60,
    monthly_emi: 0,
    total_paid: 0,
    outstanding_balance: 5000000,
    next_due_date: '2026-11-01',
    status: 'active',
    installments_paid: 0,
    installments_total: 60,
  };

  const [formData, setFormData] = useState<Omit<EmiLoan, 'id'>>(initialFormState);

  // Auto calculate EMI in form
  const handlePrincipalRateOrTermChange = (principal: number, rate: number, term: number) => {
    const calculated = calculateEmi(principal, rate, term);
    setFormData(prev => ({
      ...prev,
      principal_amount: principal,
      interest_rate: rate,
      term_months: term,
      installments_total: term,
      monthly_emi: calculated,
      outstanding_balance: principal
    }));
  };

  // Calculations across all loans
  const totalPrincipal = loans.reduce((acc, l) => acc + l.principal_amount, 0);
  const totalOutstanding = loans.reduce((acc, l) => acc + l.outstanding_balance, 0);
  const totalMonthlyCommitment = loans.filter(l => l.status === 'active').reduce((acc, l) => acc + l.monthly_emi, 0);

  const filteredLoans = loans.filter(l =>
    l.loan_id.toLowerCase().includes(search.toLowerCase()) ||
    l.lender.toLowerCase().includes(search.toLowerCase()) ||
    l.bus_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenPayment = (loan: EmiLoan) => {
    setPaymentLoan(loan);
    setPaymentAmount(loan.monthly_emi);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLoan) return;

    recordEmiPayment(paymentLoan.id, paymentAmount, paymentDate);
    setIsPaymentModalOpen(false);
  };

  const handleSubmitNewLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.loan_id || formData.principal_amount <= 0) {
      alert('Loan ID and valid principal amount are required.');
      return;
    }

    addLoan(formData);
    setIsAddOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(loans, 'FleetMind_Vehicle_Loans_EMI', [
      { key: 'loan_id', label: 'Loan Reference' },
      { key: 'bus_number', label: 'Vehicle' },
      { key: 'lender', label: 'Lender' },
      { key: 'principal_amount', label: 'Principal (₹)' },
      { key: 'interest_rate', label: 'Interest Rate (%)' },
      { key: 'monthly_emi', label: 'Monthly EMI (₹)' },
      { key: 'outstanding_balance', label: 'Outstanding (₹)' },
      { key: 'installments_paid', label: 'Paid EMIs' },
      { key: 'installments_total', label: 'Total EMIs' },
      { key: 'next_due_date', label: 'Next Due Date' },
      { key: 'status', label: 'Status' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[#00C2FF]" />
            Vehicle Loans & EMI Amortization
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track commercial bank loans, monthly instalment schedules, upcoming due dates, and remaining balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Schedule
          </button>
          <button
            onClick={() => {
              setFormData({
                ...initialFormState,
                loan_id: `LN-${Math.floor(1000 + Math.random() * 9000)}`,
                monthly_emi: calculateEmi(5000000, 8.5, 60),
              });
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Register Vehicle Loan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Financed Principal</span>
          <h3 className="text-2xl font-bold text-white mt-1.5 font-heading">{formatCurrency(totalPrincipal)}</h3>
          <p className="text-xs text-slate-400 mt-1">{loans.length} Active commercial loan contracts</p>
        </div>

        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Outstanding Balance</span>
          <h3 className="text-2xl font-bold text-amber-400 mt-1.5 font-heading">{formatCurrency(totalOutstanding)}</h3>
          <p className="text-xs text-slate-400 mt-1">Across all bank facilities</p>
        </div>

        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Monthly EMI Outflow</span>
          <h3 className="text-2xl font-bold text-[#00C2FF] mt-1.5 font-heading">{formatCurrency(totalMonthlyCommitment)}</h3>
          <p className="text-xs text-emerald-400 font-medium mt-1">Due within current billing cycle</p>
        </div>
      </div>

      {/* Loans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLoans.map((loan) => {
          const progressPct = Math.round((loan.installments_paid / (loan.installments_total || 1)) * 100);

          return (
            <div
              key={loan.id}
              className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 hover:border-[#00C2FF]/30 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {loan.loan_id}
                      </span>
                      <StatusBadge status={loan.status} size="sm" />
                    </div>
                    <h3 className="font-bold text-white text-base mt-2 font-heading group-hover:text-[#00C2FF] transition-colors">
                      {loan.bus_number} — {loan.lender}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold text-white font-mono">{formatCurrency(loan.monthly_emi)}</span>
                    <p className="text-[10px] text-slate-400">Monthly EMI</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Instalments: <b>{loan.installments_paid} / {loan.installments_total}</b></span>
                    <span className="text-emerald-400 font-semibold">{progressPct}% Paid</span>
                  </div>
                  <div className="w-full h-2 bg-[#08111F] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-[#00C2FF] transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Financial Details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#08111F] border border-white/5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Principal Financed:</span>
                    <span className="font-bold text-white mt-0.5 block">{formatCurrency(loan.principal_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Remaining Outstanding:</span>
                    <span className="font-bold text-amber-400 mt-0.5 block">{formatCurrency(loan.outstanding_balance)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-slate-400 block text-[11px]">Interest Rate:</span>
                    <span className="font-semibold text-white mt-0.5 block">{loan.interest_rate}% p.a.</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-slate-400 block text-[11px]">Next Due Date:</span>
                    <span className="font-semibold text-[#00C2FF] mt-0.5 block">{formatDate(loan.next_due_date)}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Total Repaid: {formatCurrency(loan.total_paid)}
                </span>

                <button
                  onClick={() => handleOpenPayment(loan)}
                  disabled={loan.status === 'completed'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 disabled:opacity-40 transition-colors shadow-sm"
                >
                  Record EMI Payment
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RECORD EMI PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record EMI Payment — ${paymentLoan?.loan_id}`}
        subtitle={`Vehicle ${paymentLoan?.bus_number} • ${paymentLoan?.lender}`}
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="p-4 rounded-xl bg-[#08111F] border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Next Due Date:</span>
              <span className="font-semibold text-white">{formatDate(paymentLoan?.next_due_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Outstanding:</span>
              <span className="font-semibold text-amber-400">{formatCurrency(paymentLoan?.outstanding_balance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Next Instalment Number:</span>
              <span className="font-semibold text-[#00C2FF]">
                #{(paymentLoan?.installments_paid || 0) + 1} of {paymentLoan?.installments_total}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Payment Amount (₹) *</label>
              <input
                type="number"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Recording this instalment will update remaining principal balances and automatically post a corresponding expense in the Finance module ledger.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              Confirm Bank Settlement
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD NEW LOAN MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Commercial Vehicle Loan"
        subtitle="Automatic EMI calculation based on standard amortization formula."
      >
        <form onSubmit={handleSubmitNewLoan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Loan Reference ID *</label>
              <input
                type="text"
                required
                value={formData.loan_id}
                onChange={(e) => setFormData({ ...formData, loan_id: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Lender / Financier *</label>
              <input
                type="text"
                required
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                placeholder="e.g. HDFC Commercial Vehicle Bank"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Select Vehicle</label>
              <select
                value={formData.bus_number}
                onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {buses.map(b => (
                  <option key={b.id} value={b.bus_number}>{b.bus_number} — {b.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Loan Start Date</label>
              <input
                type="date"
                required
                value={formData.loan_start_date}
                onChange={(e) => setFormData({ ...formData, loan_start_date: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Principal (₹) *</label>
              <input
                type="number"
                required
                value={formData.principal_amount}
                onChange={(e) => handlePrincipalRateOrTermChange(Number(e.target.value), formData.interest_rate, formData.term_months)}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Annual Rate (%)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.interest_rate}
                onChange={(e) => handlePrincipalRateOrTermChange(formData.principal_amount, Number(e.target.value), formData.term_months)}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Term (Months)</label>
              <input
                type="number"
                required
                value={formData.term_months}
                onChange={(e) => handlePrincipalRateOrTermChange(formData.principal_amount, formData.interest_rate, Number(e.target.value))}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Calculated Monthly Instalment (EMI):</span>
            <span className="font-bold font-mono text-[#00C2FF] text-base">{formatCurrency(formData.monthly_emi)}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              Register Loan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
