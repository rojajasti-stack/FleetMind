import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Eye, EyeOff, Lock, Mail, User, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const { error: signUpError, needsEmailVerification } = await signUpWithEmail(
      email,
      password,
      { fullName, companyName }
    );
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    if (needsEmailVerification) {
      setVerificationSent(true);
    } else {
      navigate('/');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);
    const { error: authError } = await signInWithGoogle();
    setGoogleLoading(false);
    if (authError) {
      setError(authError);
    }
  };

  return (
    <div className="min-h-screen bg-[#08111F] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00C2FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0F2742] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Create Organization Account</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Set up your commercial fleet dashboard on FleetMind AI.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {verificationSent ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">Check Your Inbox</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                A verification link has been dispatched to <b className="text-white">{email}</b>. Please click the link to verify your operator account and activate your fleet access.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] text-slate-950 hover:bg-[#00C2FF]/90 transition-colors shadow-lg"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tejeshwar Reddy"
                    className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Company / Transport Operator</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Royal Travels Pvt Ltd"
                    className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Work Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@fleetmind.ai"
                    className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {loading ? <span>Creating Account...</span> : <span>Complete Registration</span>}
              </button>
            </form>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={googleLoading}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-[#08111F] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.02h3.9c2.28-2.09 3.64-5.18 3.64-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.02c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.09-6.68-4.91H1.21v3.13C3.25 21.48 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.32 14.32c-.24-.72-.38-1.49-.38-2.32s.14-1.6.38-2.32V6.55H1.21C.44 8.09 0 9.99 0 12s.44 3.91 1.21 5.45l4.11-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.52 1.21 6.55l4.11 3.13c.94-2.82 3.58-4.93 6.68-4.93z"
                  />
                </svg>
                <span>{googleLoading ? 'Redirecting...' : 'Sign up with Google'}</span>
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 pt-6 border-t border-white/5">
              Already have an account?{' '}
              <Link to="/login" className="text-[#00C2FF] font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
