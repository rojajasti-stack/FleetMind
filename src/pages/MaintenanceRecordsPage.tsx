import React, { useState } from 'react';
import {
  FileSpreadsheet, Search, Plus, Download, Edit2, Trash2, CheckCircle2,
  Wrench, AlertTriangle, Calendar, DollarSign
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { ServiceRecord, ServiceType, ServiceStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate, formatCurrency } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const MaintenanceRecordsPage: React.FC = () => {
  const { serviceRecords, addServiceRecord, updateServiceRecord, deleteServiceRecord, buses, mechanics } = useFleetData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const initialFormState: Omit<ServiceRecord, 'id'> = {
    bus_number: buses[0]?.bus_number || 'FM-101',
    service_type: 'oil_change',
    service_date: new Date().toISOString().split('T')[0],
    cost: 12000,
    parts_used: 'OEM filter & synthetic oil (20L)',
    mechanic_notes: 'Scheduled periodic maintenance inspection.',
    next_service_prediction: '2026-12-15',
    mechanic_name: mechanics[0]?.name || 'Sunil Verma',
    priority: 'medium',
    status: 'scheduled'
  };

  const [formData, setFormData] = useState<Omit<ServiceRecord, 'id'>>(initialFormState);

  const totalCost = serviceRecords.reduce((acc, s) => acc + s.cost, 0);

  const filteredRecords = serviceRecords.filter(s => {
    const matchesSearch =
      s.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      s.service_type.toLowerCase().includes(search.toLowerCase()) ||
      s.mechanic_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData(initialFormState);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (rec: ServiceRecord) => {
    setEditingRecord(rec);
    setFormData({
      bus_number: rec.bus_number,
      service_type: rec.service_type,
      service_date: rec.service_date,
      cost: rec.cost,
      parts_used: rec.parts_used,
      mechanic_notes: rec.mechanic_notes,
      next_service_prediction: rec.next_service_prediction,
      mechanic_name: rec.mechanic_name,
      priority: rec.priority,
      status: rec.status,
    });
    setIsAddEditOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      updateServiceRecord(editingRecord.id, formData);
    } else {
      addServiceRecord(formData);
    }
    setIsAddEditOpen(false);
  };

  const handleMarkComplete = (id: string) => {
    updateServiceRecord(id, { status: 'completed' });
  };

  const handleExportCsv = () => {
    exportToCsv(serviceRecords, 'FleetMind_Maintenance_Records', [
      { key: 'bus_number', label: 'Vehicle' },
      { key: 'service_type', label: 'Service Type' },
      { key: 'service_date', label: 'Date' },
      { key: 'cost', label: 'Cost (₹)' },
      { key: 'mechanic_name', label: 'Mechanic' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'parts_used', label: 'Parts Used' },
      { key: 'next_service_prediction', label: 'Next Predicted Date' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#00C2FF]" />
            Maintenance & Service Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete vehicle repair history, cost ledger, predictive service dates, and mechanic logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Records
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Log Service Record
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Fleet Maintenance Expenditure</span>
          <h3 className="text-2xl font-bold text-emerald-400 font-heading mt-1">{formatCurrency(totalCost)}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {serviceRecords.length} Logged Overhauls
          </span>
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {serviceRecords.filter(s => s.status === 'completed').length} Completed
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#0F2742] rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle, mechanic, service..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#08111F] p-1 rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto">
          {['all', 'in_progress', 'scheduled', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-[#00C2FF] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4">Service Type</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Mechanic & Parts</th>
                <th className="px-5 py-4">Cost</th>
                <th className="px-5 py-4">Status & Priority</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold text-white font-heading text-sm">{record.bus_number}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-white capitalize">{record.service_type.replace('_', ' ')}</span>
                    <p className="text-[11px] text-slate-400 max-w-[200px] truncate">{record.mechanic_notes}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <p>{formatDate(record.service_date)}</p>
                    <p className="text-[10px] text-slate-500">Next: {formatDate(record.next_service_prediction)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-200">{record.mechanic_name}</p>
                    <p className="text-[11px] text-slate-400 max-w-[180px] truncate">{record.parts_used || 'Standard consumables'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-emerald-400 font-mono text-sm">{formatCurrency(record.cost)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <StatusBadge status={record.status} size="sm" />
                      <span className={`block text-[10px] font-bold uppercase ${
                        record.priority === 'critical' ? 'text-rose-400' :
                        record.priority === 'high' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {record.priority} priority
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {record.status !== 'completed' && (
                        <button
                          onClick={() => handleMarkComplete(record.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Mark Complete"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(record)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRecordId(record.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingRecord ? `Edit Service Record — ${editingRecord.bus_number}` : 'Create Maintenance Service Record'}
        subtitle="Log workshop labor, replaced spare parts, and update vehicle maintenance readiness."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Select Vehicle</label>
              <select
                value={formData.bus_number}
                onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {buses.map(b => (
                  <option key={b.id} value={b.bus_number}>{b.bus_number} — {b.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Service Type</label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value as ServiceType })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="oil_change">Oil Change & Filter</option>
                <option value="brake_repair">Brake System & Calipers</option>
                <option value="engine_tuneup">Engine & Transmission Overhaul</option>
                <option value="tire_replacement">Tire Replacement & Balancing</option>
                <option value="battery">EV Battery & Electrical</option>
                <option value="inspection">Statutory Safety Inspection</option>
                <option value="other">Other Mechanical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Service Date</label>
              <input
                type="date"
                required
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Actual / Estimated Cost (₹)</label>
              <input
                type="number"
                required
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Assigned Mechanic</label>
              <select
                value={formData.mechanic_name}
                onChange={(e) => setFormData({ ...formData, mechanic_name: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {mechanics.map(m => (
                  <option key={m.id} value={m.name}>{m.name} ({m.specialty})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Service Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ServiceStatus })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Next Predicted Service</label>
              <input
                type="date"
                value={formData.next_service_prediction}
                onChange={(e) => setFormData({ ...formData, next_service_prediction: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Spare Parts Used</label>
            <input
              type="text"
              value={formData.parts_used}
              onChange={(e) => setFormData({ ...formData, parts_used: e.target.value })}
              placeholder="e.g. 2x Knorr-Bremse Front Disc Brake Pads Set"
              className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Mechanic Work Notes</label>
            <textarea
              rows={2}
              value={formData.mechanic_notes}
              onChange={(e) => setFormData({ ...formData, mechanic_notes: e.target.value })}
              placeholder="Diagnostics details, dynamometer test results, fluid replacements..."
              className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              {editingRecord ? 'Update Record' : 'Save Service Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={Boolean(deletingRecordId)}
        onClose={() => setDeletingRecordId(null)}
        onConfirm={() => {
          if (deletingRecordId) deleteServiceRecord(deletingRecordId);
        }}
        title="Delete Service Record"
        message="Are you sure you want to delete this historical service log?"
      />
    </div>
  );
};
