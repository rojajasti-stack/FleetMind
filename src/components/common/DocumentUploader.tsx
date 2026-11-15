import React, { useState, useRef } from 'react';
import {
  Upload, FileText, Image as ImageIcon, CheckCircle, AlertTriangle,
  X, ExternalLink, Trash2, Loader2, ShieldCheck, Lock
} from 'lucide-react';
import {
  StorageBucket,
  STORAGE_BUCKET_CONFIG,
  uploadFileToStorage,
  getSignedDocumentUrl,
  deleteStorageDocument,
  validateStorageFile,
  UploadResult
} from '../../services/storage';

export interface StoredDocument {
  name: string;
  path: string;
  url?: string;
  size?: number;
  uploadedAt?: string;
  category?: string;
}

interface DocumentUploaderProps {
  bucket: StorageBucket;
  organizationId?: string;
  userId?: string;
  entityId?: string;
  category?: string;
  label: string;
  description?: string;
  currentDocument?: StoredDocument | null;
  onUploadSuccess: (result: UploadResult) => void;
  onRemoveDocument?: () => void;
  readOnly?: boolean;
  compact?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  bucket,
  organizationId,
  userId,
  entityId,
  category,
  label,
  description,
  currentDocument,
  onUploadSuccess,
  onRemoveDocument,
  readOnly = false,
  compact = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentDocument?.url || null);

  const bucketConfig = STORAGE_BUCKET_CONFIG[bucket];
  const maxMb = (bucketConfig.maxSizeBytes / (1024 * 1024)).toFixed(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (readOnly || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFileUpload(e.target.files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processFileUpload = async (file: File) => {
    setErrorMessage(null);

    // 1. Client-Side Pre-validation
    const validation = validateStorageFile(file, bucket);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'File validation failed');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFileToStorage({
        bucket,
        file,
        organizationId,
        userId,
        entityId,
        category
      });

      setPreviewUrl(result.signedUrl);
      onUploadSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDocument = async () => {
    if (!currentDocument?.path && !previewUrl) return;

    try {
      let targetUrl = previewUrl || currentDocument?.url;
      if (!targetUrl || targetUrl.startsWith('blob:') === false) {
        targetUrl = await getSignedDocumentUrl(bucket, currentDocument?.path || '', 3600);
      }
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        setErrorMessage('Unable to generate secure download link.');
      }
    } catch (err) {
      setErrorMessage('Could not open file.');
    }
  };

  const handleDelete = async () => {
    if (!currentDocument?.path || readOnly) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteStorageDocument(bucket, currentDocument.path);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to delete file.');
      } else {
        setPreviewUrl(null);
        if (onRemoveDocument) onRemoveDocument();
      }
    } catch (err) {
      setErrorMessage('Error deleting document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasDocument = Boolean(currentDocument?.path || previewUrl);
  const isImage = currentDocument?.name?.match(/\.(jpg|jpeg|png|webp)$/i) || previewUrl?.startsWith('data:image') || previewUrl?.includes('avatar');

  return (
    <div className="space-y-2">
      {/* Label and Constraints */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 block">{label}</label>
        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3 h-3 text-[#00C2FF]" />
          Max {maxMb}MB • {bucketConfig.allowedExtensions.map(e => e.toUpperCase()).join(', ')}
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={bucketConfig.allowedMimeTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={readOnly || isUploading}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active File Display or Upload Zone */}
      {hasDocument ? (
        <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-[#00C2FF]/10 border border-[#00C2FF]/20 flex items-center justify-center shrink-0">
              {isImage ? (
                <ImageIcon className="w-4 h-4 text-[#00C2FF]" />
              ) : (
                <FileText className="w-4 h-4 text-[#00C2FF]" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {currentDocument?.name || 'Uploaded Document'}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle className="w-3 h-3" /> Encrypted Vault
                </span>
                {currentDocument?.size && (
                  <span>• {(currentDocument.size / 1024).toFixed(0)} KB</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenDocument}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="View Encrypted Document via Signed URL"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {!readOnly && onRemoveDocument && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                title="Remove Document"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !readOnly && !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#00C2FF] bg-[#00C2FF]/10'
              : 'border-white/10 hover:border-[#00C2FF]/40 bg-[#08111F]/50 hover:bg-[#08111F]'
          } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {isUploading ? (
            <div className="py-2 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#00C2FF] animate-spin" />
              <p className="text-xs font-semibold text-white">Encrypting and uploading file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#00C2FF]">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                {compact ? 'Click or drop file' : 'Click to select or drag and drop document'}
              </p>
              <p className="text-[10px] text-slate-400">
                Private vault storage with auto-signed tokens
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
