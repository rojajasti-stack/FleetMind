import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Users, Plus, Download, Phone, ShieldCheck,
  CheckCircle, Clock, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { Mechanic } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { formatCurrency } from '../utils/formatters';

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const { mechanics, serviceRecords, buses } = useFleetData();

  const activeServices = serviceRecords.filter(s => s.status === 'in_progress');
  const scheduledServices = serviceRecords.filter(s => s.status === 'scheduled');
  const completedServices = serviceRecords.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-[#00C2FF]" />
            Mechanics & Workshop Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Certified workshop technicians, bay allocations, active repair tasks, and labor rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/maintenance-records')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            View Service Records & History →
          </button>
        </div>
      </div>

      {/* Workshop Bay Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Active Workshop Repairs</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2 font-heading">{activeServices.length} Vehicles</h3>
          <p className="text-xs text-amber-400/90 mt-1 font-medium">Bays 1 & 2 occupied</p>
        </div>

        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Scheduled Inspections</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C2FF]" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2 font-heading">{scheduledServices.length} Pending</h3>
          <p className="text-xs text-slate-400 mt-1">Upcoming within 14 days</p>
        </div>

        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Completed This Month</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2 font-heading">{completedServices.length} Overhauls</h3>
          <p className="text-xs text-emerald-400 mt-1 font-medium">100% Quality certified</p>
        </div>
      </div>

      {/* Mechanics Roster */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white font-heading">Certified Fleet Mechanics</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {mechanics.map((mech) => (
            <div
              key={mech.id}
              className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 hover:border-[#00C2FF]/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#00C2FF] flex items-center justify-center font-bold text-sm">
                    {mech.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <StatusBadge status={mech.status} size="sm" />
                </div>

                <h4 className="font-bold text-white text-base mt-3 font-heading group-hover:text-[#00C2FF] transition-colors">
                  {mech.name}
                </h4>
                <p className="text-xs text-[#00C2FF] font-medium mt-0.5">{mech.specialty}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">{mech.phone}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Tasks: <b className="text-white">{mech.active_tasks}</b>
                </span>
                <span className="text-emerald-400 font-semibold">
                  {formatCurrency(mech.hourly_rate)} / hr
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Currently In-Workshop Services */}
      <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5">
        <h3 className="text-base font-bold text-white font-heading mb-4">Active Workshop Bay Status</h3>

        <div className="space-y-3">
          {activeServices.map((srv) => (
            <div key={srv.id} className="p-4 rounded-xl bg-[#08111F] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white font-heading text-sm">{srv.bus_number}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                    {srv.service_type.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    srv.priority === 'critical' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {srv.priority} priority
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{srv.mechanic_notes}</p>
                <p className="text-[11px] text-slate-400 mt-1">Lead Tech: {srv.mechanic_name} • Parts: {srv.parts_used}</p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                <span className="font-bold text-emerald-400 text-sm">{formatCurrency(srv.cost)}</span>
                <button
                  onClick={() => navigate('/maintenance-records')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00C2FF]/10 text-[#00C2FF] hover:bg-[#00C2FF] hover:text-slate-950 transition-colors"
                >
                  Manage Service
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
