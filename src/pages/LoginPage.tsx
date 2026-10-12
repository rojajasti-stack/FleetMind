import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@fleetmind.ai');
  const [password, setPassword] = useState('FleetMind2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email && password) {
        localStorage.setItem('fleetmind_auth_token', 'demo_session_active');
        navigate('/');
      } else {
        setError('Please enter a valid email and password.');
        setLoading(false);
      }
    }, 600);
  };

  const handleDemoLogin = () => {
    setEmail('demo@fleetmind.ai');
    setPassword('FleetMind2026!');
    localStorage.setItem('fleetmind_auth_token', 'demo_session_active');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#08111F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00C2FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0F2742] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold text-white font-heading tracking-tight">FleetMind</h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#00C2FF]/20 text-[#00C2FF] border border-[#00C2FF]/30 tracking-wider">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Sign in to access your enterprise transport operations dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@company.com"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-[#00C2FF] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
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
            className="w-full py-3 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access */}
        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00C2FF]" />
            Quick Demo Login (1-Click)
          </button>

          <p className="text-center text-xs text-slate-400">
            Don't have an operator account?{' '}
            <Link to="/register" className="text-[#00C2FF] font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
