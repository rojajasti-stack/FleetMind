import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Lock, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const requiredRoles = (location.state as { requiredRoles?: string[] } | null)?.requiredRoles;

  const roleBadgeColor = {
    'Super Admin': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Admin': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Fleet Manager': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Dispatcher': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'Accountant': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Normal User': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    'Guest': 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  }[profile?.role || 'Guest'] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-[#0D1829] border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-950/20 text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>

        {/* Heading */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>HTTP 403 • Authorization Failure</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-sm text-slate-400 mb-6">
          Your current account role does not have the verified database permissions required to access this resource.
        </p>

        {/* User Identity & Role Breakdown */}
        <div className="bg-[#08111F] rounded-xl border border-slate-800 p-4 mb-6 text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Signed In As:</span>
            <span className="font-semibold text-white">{profile?.full_name || 'Anonymous / Guest'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Assigned Database Role:</span>
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${roleBadgeColor}`}>
              {profile?.role || 'Guest'}
            </span>
          </div>
          {requiredRoles && requiredRoles.length > 0 && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
              <span className="text-slate-400">Privilege Required:</span>
              <span className="text-amber-400 font-medium">
                {requiredRoles.join(' or ')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Organization:</span>
            <span className="text-slate-300 font-mono text-[11px]">{profile?.company_name || 'FleetMind Operations'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/25"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>If you believe this is an error, request elevated access from your fleet Administrator.</span>
        </div>
      </div>
    </div>
  );
};
