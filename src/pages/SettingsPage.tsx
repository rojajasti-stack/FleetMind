import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Save, Building, Bell, Shield, Sliders,
  CheckCircle, Globe, DollarSign, Clock, AlertTriangle
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useFleetData();
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-[#00C2FF]" />
            Fleet System & Enterprise Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure currency standards, automated telematics alert thresholds, and notification routing.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GENERAL SETTINGS */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <Building className="w-4 h-4 text-[#00C2FF]" />
            <h3 className="font-bold text-white text-sm font-heading">Company & Localization</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Organization Legal Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Default Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({
                  ...formData,
                  currency: e.target.value,
                  currency_symbol: e.target.value === 'INR' ? '₹' : '$'
                })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="INR">Indian Rupee (₹ INR)</option>
                <option value="USD">US Dollar ($ USD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Time Zone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="Asia/Kolkata (IST +5:30)">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
                <option value="America/New_York (EST)">America/New York (EST)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Date Display Format</label>
              <select
                value={formData.date_format}
                onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
          </div>
        </div>

        {/* FLEET THRESHOLDS & TELEMATICS */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <Sliders className="w-4 h-4 text-[#00C2FF]" />
            <h3 className="font-bold text-white text-sm font-heading">Automated Telematics & Maintenance Triggers</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                Fuel Efficiency Alert Floor (km/L)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.fuel_efficiency_alert_threshold}
                onChange={(e) => setFormData({ ...formData, fuel_efficiency_alert_threshold: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Flag if bus consumes below this rate</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                Maintenance Reminder Lead Days
              </label>
              <input
                type="number"
                value={formData.maintenance_reminder_days}
                onChange={(e) => setFormData({ ...formData, maintenance_reminder_days: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Notify prior to scheduled overhaul date</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                Low Inventory Warning Units
              </label>
              <input
                type="number"
                value={formData.low_stock_warning_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_warning_threshold: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Trigger reorder notification alert</span>
            </div>
          </div>
        </div>

        {/* NOTIFICATION PREFERENCES */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <Bell className="w-4 h-4 text-[#00C2FF]" />
            <h3 className="font-bold text-white text-sm font-heading">Alert Routing Channels</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifications_email}
                onChange={(e) => setFormData({ ...formData, notifications_email: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 text-[#00C2FF] focus:ring-0 bg-[#08111F]"
              />
              <div>
                <span className="text-xs font-bold text-white block">Email Compliance Digests</span>
                <span className="text-[11px] text-slate-400 block">Send daily summaries of expiring driver licences & insurance policies</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifications_browser}
                onChange={(e) => setFormData({ ...formData, notifications_browser: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 text-[#00C2FF] focus:ring-0 bg-[#08111F]"
              />
              <div>
                <span className="text-xs font-bold text-white block">Browser Audio & Push Banners</span>
                <span className="text-[11px] text-slate-400 block">Immediate dispatch alerts when vehicles go offline or enter workshop</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
