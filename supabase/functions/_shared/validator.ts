// supabase/functions/_shared/validator.ts

export class ValidationError extends Error {
  public code = 'VALIDATION_ERROR';
  public status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function parseJsonBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      throw new ValidationError('Empty request body. JSON payload expected.');
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('Malformed JSON payload in request body.');
  }
}

export function validateUuid(val: unknown, fieldName: string): string {
  if (typeof val !== 'string') {
    throw new ValidationError(`${fieldName} must be a valid string UUID.`);
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(val.trim())) {
    throw new ValidationError(`${fieldName} must be a valid RFC4122 UUID.`);
  }
  return val.trim();
}

export function validateNumber(
  val: unknown,
  fieldName: string,
  min?: number,
  max?: number
): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    throw new ValidationError(`${fieldName} must be a valid finite number.`);
  }
  if (min !== undefined && val < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}.`);
  }
  if (max !== undefined && val > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max}.`);
  }
  return val;
}

export function validateString(
  val: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 500
): string {
  if (typeof val !== 'string') {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = val.trim();
  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters.`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength} characters.`);
  }
  return trimmed;
}

export function validateEnum<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (typeof val !== 'string' || !allowed.includes(val as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}: '${val}'. Allowed values: ${allowed.join(', ')}`
    );
  }
  return val as T;
}

/**
 * Sanitizes an object before logging to ensure secrets, passwords,
 * tokens, and confidential PII are never printed to logs.
 */
export function sanitizeLogData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const SENSITIVE_KEYS = [
    'password', 'token', 'authorization', 'secret', 'key',
    'access_token', 'refresh_token', 'apikey', 'service_role',
    'cookie', 'session', 'signature'
  ];

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
