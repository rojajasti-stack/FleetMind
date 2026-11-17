import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Building, Shield, Key, Save, CheckCircle,
  Smartphone, QrCode, Lock, CheckCircle2, AlertCircle, RefreshCw,
  Camera, Loader2, Upload
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { uploadFileToStorage } from '../services/storage';
import type { Factor } from '@supabase/supabase-js';

export const ProfilePage: React.FC = () => {
  const { profile: storeProfile } = useFleetData();
  const {
    profile: authProfile,
    updateUserProfile,
    updatePassword,
    user,
    authMode,
    isSupabaseConfigured,
    enrollMfaTotp,
    verifyMfaTotp,
    unenrollMfaTotp,
    getMfaFactors
  } = useAuth();

  const currentProfile = authProfile || storeProfile;
  const [formData, setFormData] = useState<UserProfile>(currentProfile);

  // Password Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Avatar Upload State
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  // MFA State
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState<{ factorId?: string; qrCode?: string; secret?: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');

  useEffect(() => {
    if (currentProfile) {
      setFormData(currentProfile);
    }
  }, [currentProfile]);

  // Load active MFA factors
  useEffect(() => {
    async function loadFactors() {
      if (isSupabaseConfigured && user) {
        const factors = await getMfaFactors();
        setMfaFactors(factors.totp);
      }
    }
    loadFactors();
  }, [isSupabaseConfigured, user, getMfaFactors]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await updateUserProfile(formData);
    if (!error) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingAvatar(true);
    setAvatarUploadError(null);

    try {
      const result = await uploadFileToStorage({
        bucket: 'avatars',
        file,
        userId: user?.id || currentProfile.id,
        organizationId: currentProfile.organization_id || '00000000-0000-0000-0000-000000000001'
      });

      const newAvatarUrl = result.signedUrl || result.downloadUrl;
      const updated = { ...formData, avatar_url: newAvatarUrl };
      setFormData(updated);
      await updateUserProfile(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setAvatarUploadError(err instanceof Error ? err.message : 'Failed to upload avatar image');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');

    if (newPassword.length < 6) {
      setPasswordMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    const { error } = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (error) {
      setPasswordMsg(error);
    } else {
      setPasswordMsg('Password successfully changed for current operator session.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 4000);
    }
  };

  const handleStartMfaEnroll = async () => {
    setMfaError('');
    setMfaSuccess('');
    setMfaLoading(true);
    const res = await enrollMfaTotp();
    setMfaLoading(false);

    if (res.error) {
      setMfaError(res.error);
    } else {
      setMfaEnrollData({
        factorId: res.factorId,
        qrCode: res.qrCode,
        secret: res.secret
      });
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaEnrollData?.factorId || !totpCode) return;

    setMfaLoading(true);
    setMfaError('');
    const res = await verifyMfaTotp(mfaEnrollData.factorId, totpCode.trim());
    setMfaLoading(false);

    if (res.error) {
      setMfaError(res.error);
    } else {
      setMfaSuccess('Two-Factor Authentication (TOTP) successfully activated!');
      setMfaEnrollData(null);
      setTotpCode('');
      const factors = await getMfaFactors();
      setMfaFactors(factors.totp);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    setMfaLoading(true);
    setMfaError('');
    const res = await unenrollMfaTotp(factorId);
    setMfaLoading(false);

    if (res.error) {
      setMfaError(res.error);
    } else {
      setMfaSuccess('MFA authenticator factor removed.');
      const factors = await getMfaFactors();
      setMfaFactors(factors.totp);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-[#00C2FF]" />
            Operator Profile & Security
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your personal fleet director profile, credentials, and two-factor authentication.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Profile updated successfully!
          </div>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-white/5">
          <div className="relative group">
            <img
              src={formData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={formData.full_name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#00C2FF]/40 shadow-xl"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#0F2742]" />
            
            {/* Upload Avatar Trigger */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 cursor-pointer"
              title="Change Profile Avatar (Max 2MB, JPEG/PNG/WebP)"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 text-[#00C2FF] animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5 text-[#00C2FF]" />
                  <span>Update</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-white font-heading">{formData.full_name}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                authMode === 'supabase'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}>
                {authMode === 'supabase' ? 'Supabase Cloud Auth Active' : 'Offline Demo Session'}
              </span>
            </div>
            <p className="text-xs text-[#00C2FF] font-semibold">{formData.job_title}</p>
            <p className="text-xs text-slate-400">{formData.company_name} • Role: {formData.role}</p>
            {avatarUploadError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> {avatarUploadError}
              </p>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={user?.email || formData.email || ''}
                className="w-full bg-[#08111F]/50 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              <Save className="w-4 h-4" />
              Save Profile Details
            </button>
          </div>
        </form>
      </div>

      {/* CHANGE PASSWORD */}
      <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <Key className="w-4 h-4 text-[#00C2FF]" />
          <h3 className="font-bold text-white text-sm font-heading">Security & Password</h3>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            passwordMsg.includes('success')
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* MULTI-FACTOR AUTHENTICATION (MFA / TOTP) */}
      <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-[#00C2FF]" />
            <div>
              <h3 className="font-bold text-white text-sm font-heading">Two-Factor Authentication (MFA / TOTP)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Secure your operator account with Google Authenticator, Authy, or 1Password.
              </p>
            </div>
          </div>

          {mfaFactors.length > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Enabled ({mfaFactors.length})
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
              Disabled
            </span>
          )}
        </div>

        {mfaError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mfaError}</span>
          </div>
        )}

        {mfaSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mfaSuccess}</span>
          </div>
        )}

        {/* Existing factors */}
        {mfaFactors.length > 0 && (
          <div className="space-y-2">
            {mfaFactors.map((factor) => (
              <div key={factor.id} className="p-3 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{factor.friendly_name || 'Authenticator App'}</p>
                    <p className="text-[10px] text-slate-400">Added: {new Date(factor.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDisableMfa(factor.id)}
                  disabled={mfaLoading}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                >
                  Remove Factor
                </button>
              </div>
            ))}
          </div>
        )}

        {/* QR Code Enrollment Mode */}
        {mfaEnrollData ? (
          <div className="p-5 rounded-xl bg-[#08111F] border border-[#00C2FF]/30 space-y-4">
            <div className="text-center space-y-2">
              <h4 className="text-sm font-bold text-white">Scan Authenticator QR Code</h4>
              <p className="text-xs text-slate-400">
                Scan this code in your authenticator app (Google Authenticator, Authy), then enter the 6-digit verification code below.
              </p>
            </div>

            {mfaEnrollData.qrCode && (
              <div className="flex justify-center p-3 bg-white rounded-xl max-w-xs mx-auto">
                <img src={mfaEnrollData.qrCode} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            )}

            {mfaEnrollData.secret && (
              <div className="text-center">
                <span className="text-[11px] text-slate-400">Manual secret key: </span>
                <code className="text-xs font-mono text-[#00C2FF] bg-black/40 px-2 py-0.5 rounded">
                  {mfaEnrollData.secret}
                </code>
              </div>
            )}

            <form onSubmit={handleVerifyMfa} className="flex gap-2 max-w-sm mx-auto">
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="flex-1 bg-[#0F2742] border border-white/10 rounded-xl px-4 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-[#00C2FF]"
              />
              <button
                type="submit"
                disabled={mfaLoading || totpCode.length < 6}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] text-slate-950 hover:bg-[#00C2FF]/90 transition-colors disabled:opacity-50"
              >
                {mfaLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={handleStartMfaEnroll}
              disabled={mfaLoading || !isSupabaseConfigured}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors disabled:opacity-40"
            >
              <QrCode className="w-4 h-4 text-[#00C2FF]" />
              <span>Enroll New Authenticator App (TOTP)</span>
            </button>
            {!isSupabaseConfigured && (
              <p className="text-[11px] text-slate-500 mt-1">
                * MFA requires Supabase cloud credentials configured in .env.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
