/**
 * FleetMind AI — Supabase Storage Service
 *
 * Implements client-side management for isolated storage buckets:
 * - 'avatars': User operator profile avatars (max 2MB, JPEG/PNG/WebP)
 * - 'vehicle-documents': RC books, insurance policies, permits (max 10MB, PDF/JPEG/PNG/WebP)
 * - 'driver-documents': Driver commercial licenses, medical PII (max 10MB, PDF/JPEG/PNG)
 * - 'receipts': Fuel dispenser receipts, maintenance invoices (max 10MB, PDF/JPEG/PNG/WebP)
 *
 * Security Principles:
 * 1. Client-side MIME and size validation prior to network dispatch.
 * 2. Strict filename sanitization and path traversal prevention.
 * 3. Enforces multi-tenant folder path structure (<org_id>/<category>/...) matching PostgreSQL RLS.
 * 4. Zero public bucket exposure: generates short-lived signed URLs for private document access.
 * 5. Full offline demo mode fallback when Supabase is not configured or in guest demo mode.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export type StorageBucket = 'avatars' | 'vehicle-documents' | 'driver-documents' | 'receipts';

export interface BucketMetadata {
  id: StorageBucket;
  name: string;
  isPublic: boolean;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  description: string;
}

export const STORAGE_BUCKET_CONFIG: Record<StorageBucket, BucketMetadata> = {
  'avatars': {
    id: 'avatars',
    name: 'Operator Avatars',
    isPublic: false,
    maxSizeBytes: 2 * 1024 * 1024, // 2 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    description: 'Fleet operator and driver profile images'
  },
  'vehicle-documents': {
    id: 'vehicle-documents',
    name: 'Vehicle Compliance Documents',
    isPublic: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    description: 'Vehicle Registration Certificate (RC), Insurance, Fitness, and State Permits'
  },
  'driver-documents': {
    id: 'driver-documents',
    name: 'Driver Licenses & PII Documents',
    isPublic: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    description: 'Commercial Heavy Driving Licenses, Medical Fitness, and Police Verifications'
  },
  'receipts': {
    id: 'receipts',
    name: 'Financial Invoices & Receipts',
    isPublic: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    description: 'Fuel Station Dispensing Bills, Workshop Invoices, and Toll Receipts'
  }
};

export class StorageError extends Error {
  public code: 'VALIDATION_FAILED' | 'UNAUTHORIZED' | 'PAYLOAD_TOO_LARGE' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'UNKNOWN';
  public bucket?: StorageBucket;

  constructor(message: string, code: StorageError['code'] = 'UNKNOWN', bucket?: StorageBucket) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.bucket = bucket;
  }
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedExtension?: string;
}

/**
 * Validates a file against bucket constraints:
 * - Size limit
 * - Allowed MIME types
 * - Extension matching MIME type
 * - Dangerous filename characters
 */
export function validateStorageFile(file: File, bucket: StorageBucket): FileValidationResult {
  const config = STORAGE_BUCKET_CONFIG[bucket];
  if (!config) {
    return { isValid: false, error: `Invalid storage bucket: ${bucket}` };
  }

  // 1. File Size Verification
  if (file.size > config.maxSizeBytes) {
    const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds the ${maxMb} MB limit for ${config.name}. (Provided: ${(file.size / (1024 * 1024)).toFixed(2)} MB)`
    };
  }

  // 2. MIME Type Verification
  const mimeType = file.type.toLowerCase();
  if (!config.allowedMimeTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `Unsupported file type (${mimeType || 'unknown'}). Allowed: ${config.allowedExtensions.join(', ')}`
    };
  }

  // 3. Extension Verification
  const parts = file.name.split('.');
  if (parts.length < 2) {
    return { isValid: false, error: 'File must have a valid extension.' };
  }
  const extension = parts.pop()?.toLowerCase() || '';
  if (!config.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Disallowed extension .${extension}. Allowed: ${config.allowedExtensions.join(', ')}`
    };
  }

  // 4. Filename Security Verification (Prevent directory traversal, control chars)
  const baseName = parts.join('.');
  // eslint-disable-next-line no-control-regex
  if (/[<>:"/\\|?*\x00-\x1F]/.test(baseName) || baseName.includes('..')) {
    return {
      isValid: false,
      error: 'Filename contains invalid or dangerous characters.'
    };
  }

  return { isValid: true, sanitizedExtension: extension };
}

/**
 * Generates an isolated, collision-resistant path compatible with PostgreSQL RLS policies
 */
export interface GeneratePathParams {
  bucket: StorageBucket;
  organizationId: string;
  userId?: string;
  entityId?: string;
  category?: string;
  fileName: string;
}

export function generateStoragePath(params: GeneratePathParams): string {
  const { bucket, organizationId, userId, entityId, category, fileName } = params;
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  
  // Clean filename
  const cleanExt = fileName.split('.').pop()?.toLowerCase() || 'bin';
  const rawBase = fileName.substring(0, fileName.lastIndexOf('.')) || 'file';
  const cleanBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);

  if (bucket === 'avatars') {
    // RLS: split_part(name, '/', 1) = auth.uid()::text
    const uid = userId || '00000000-0000-0000-0000-000000000001';
    return `${uid}/avatar_${timestamp}_${randomSuffix}.${cleanExt}`;
  }

  if (bucket === 'vehicle-documents') {
    // RLS: split_part(name, '/', 1)::uuid = current_user_org_id()
    const busId = entityId || 'vehicle';
    const docCategory = category ? category.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'doc';
    return `${organizationId}/vehicles/${busId}/${docCategory}_${cleanBase}_${timestamp}.${cleanExt}`;
  }

  if (bucket === 'driver-documents') {
    // RLS: split_part(name, '/', 1)::uuid = current_user_org_id()
    const driverId = entityId || 'driver';
    const docCategory = category ? category.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'license';
    return `${organizationId}/drivers/${driverId}/${docCategory}_${cleanBase}_${timestamp}.${cleanExt}`;
  }

  if (bucket === 'receipts') {
    // RLS: split_part(name, '/', 1)::uuid = current_user_org_id()
    const cat = category ? category.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'fuel';
    const refId = entityId || 'txn';
    return `${organizationId}/receipts/${cat}/${refId}_${timestamp}_${randomSuffix}.${cleanExt}`;
  }

  return `${organizationId}/${timestamp}_${cleanBase}.${cleanExt}`;
}

export interface UploadOptions {
  bucket: StorageBucket;
  file: File;
  organizationId?: string;
  userId?: string;
  entityId?: string;
  category?: string;
  customPath?: string;
  upsert?: boolean;
}

export interface UploadResult {
  success: boolean;
  bucket: StorageBucket;
  path: string;
  signedUrl: string;
  downloadUrl: string;
  isDemo: boolean;
  fileSize: number;
  mimeType: string;
  error?: string;
}

/**
 * Uploads a document to the specified private Supabase Storage bucket.
 * Enforces validation, generates secure paths, and returns short-lived signed URLs.
 * In demo/offline mode, falls back gracefully to local ObjectURLs.
 */
export async function uploadFileToStorage(options: UploadOptions): Promise<UploadResult> {
  const { bucket, file, organizationId, userId, entityId, category, customPath, upsert } = options;

  // 1. Client-Side Validation
  const validation = validateStorageFile(file, bucket);
  if (!validation.isValid) {
    throw new StorageError(validation.error || 'File validation failed', 'VALIDATION_FAILED', bucket);
  }

  const effectiveOrgId = organizationId || '00000000-0000-0000-0000-000000000001';
  const storagePath = customPath || generateStoragePath({
    bucket,
    organizationId: effectiveOrgId,
    userId,
    entityId,
    category,
    fileName: file.name
  });

  // 2. Demo / Offline Mode Fallback
  if (!isSupabaseConfigured || !supabase) {
    const localUrl = URL.createObjectURL(file);
    return {
      success: true,
      bucket,
      path: storagePath,
      signedUrl: localUrl,
      downloadUrl: localUrl,
      isDemo: true,
      fileSize: file.size,
      mimeType: file.type
    };
  }

  // 3. Live Supabase Storage Upload
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: upsert || false,
        contentType: file.type
      });

    if (uploadError) {
      if (uploadError.message.includes('row-level security') || uploadError.message.includes('not authorized')) {
        throw new StorageError('Permission denied: You do not have authorization to upload to this folder.', 'UNAUTHORIZED', bucket);
      }
      if (uploadError.message.includes('exceeded') || uploadError.message.includes('too large')) {
        throw new StorageError('File size exceeds storage bucket limits.', 'PAYLOAD_TOO_LARGE', bucket);
      }
      throw new StorageError(`Upload failed: ${uploadError.message}`, 'NETWORK_ERROR', bucket);
    }

    // 4. Generate Short-Lived Signed URL for Immediate Access (60 minutes)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(uploadData.path, 3600);

    if (signedError) {
      console.warn('[Storage Notice] Signed URL generation error:', signedError.message);
    }

    const signedUrl = signedData?.signedUrl || '';

    return {
      success: true,
      bucket,
      path: uploadData.path,
      signedUrl,
      downloadUrl: signedUrl,
      isDemo: false,
      fileSize: file.size,
      mimeType: file.type
    };
  } catch (err: unknown) {
    if (err instanceof StorageError) throw err;
    const msg = err instanceof Error ? err.message : 'Unknown storage upload error';
    throw new StorageError(msg, 'UNKNOWN', bucket);
  }
}

/**
 * Generates a fresh short-lived signed URL for accessing a private document.
 * Defaults to 60 minutes (3600 seconds), or shorter for high-security PII (e.g. 300s).
 */
export async function getSignedDocumentUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!path) return '';

  // Return directly if already an object or external URL
  if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (!isSupabaseConfigured || !supabase) {
    return path;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`[Storage Warning] Failed to generate signed URL for ${path}:`, error?.message);
      return '';
    }

    return data.signedUrl;
  } catch (err) {
    console.error(`[Storage Error] Could not create signed URL:`, err);
    return '';
  }
}

/**
 * Securely deletes a stored file from a Supabase bucket.
 * Enforces PostgreSQL RLS delete policies (e.g. only Admins can delete compliance documents).
 */
export async function deleteStorageDocument(
  bucket: StorageBucket,
  path: string
): Promise<{ success: boolean; error?: string }> {
  if (!path) return { success: true };

  if (!isSupabaseConfigured || !supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        return {
          success: false,
          error: 'Permission denied: Only administrators are authorized to delete compliance documents.'
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Storage delete error'
    };
  }
}
