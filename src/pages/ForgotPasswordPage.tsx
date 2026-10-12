import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#08111F] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-[#0F2742] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Recover Operator Password</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Enter your registered email address and we'll send you password reset recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Recovery Link Dispatched</h3>
            <p className="text-xs text-slate-300">
              We've dispatched password recovery steps to <b className="text-white">{email}</b>. Follow the link in the message to reset your credentials.
            </p>
            <div className="pt-2">
              <Link
                to="/reset-password"
                className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] text-slate-950"
              >
                Proceed to Reset Password Screen →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@fleetmind.ai"
                  className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20 flex items-center justify-center gap-2"
            >
              {loading ? <span>Sending...</span> : <span>Send Recovery Instructions</span>}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <Link
            to="/login"
            className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
