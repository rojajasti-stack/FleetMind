import React, { useState } from 'react';
import {
  Users, Search, Plus, Download, Edit2, Trash2, Eye, ShieldCheck,
  Phone, Mail, Calendar, Bus, Award, AlertCircle
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { Driver, DriverStatus, DriverAvailability } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate, formatDistance } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const DriversPage: React.FC = () => {
  const { drivers, addDriver, updateDriver, deleteDriver, buses } = useFleetData();

  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);

  // Form State
  const initialFormState: Omit<Driver, 'id'> = {
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: '2028-01-01',
    joining_date: '2023-01-01',
    assigned_bus: '',
    status: 'active',
    today_availability: 'available',
    experience_years: 5,
    total_trips: 0,
    distance_km: 0,
    safety_score: 95,
    emergency_contact: '',
  };

  const [formData, setFormData] = useState<Omit<Driver, 'id'>>(initialFormState);

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      d.license_number.toLowerCase().includes(search.toLowerCase());
    const matchesAvail = availabilityFilter === 'all' || d.today_availability === availabilityFilter;
    return matchesSearch && matchesAvail;
  });

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage) || 1;
  const paginatedDrivers = filteredDrivers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData(initialFormState);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (d: Driver) => {
    setEditingDriver(d);
    setFormData({
      name: d.name,
      phone: d.phone,
      email: d.email,
      license_number: d.license_number,
      license_expiry: d.license_expiry,
      joining_date: d.joining_date,
      assigned_bus: d.assigned_bus || '',
      status: d.status,
      today_availability: d.today_availability,
      experience_years: d.experience_years,
      total_trips: d.total_trips,
      distance_km: d.distance_km,
      safety_score: d.safety_score,
      emergency_contact: d.emergency_contact || '',
    });
    setIsAddEditOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.license_number) {
      alert('Name, phone, and licence number are required.');
      return;
    }

    if (editingDriver) {
      updateDriver(editingDriver.id, formData);
    } else {
      addDriver(formData);
    }
    setIsAddEditOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(drivers, 'FleetMind_Drivers_Roster', [
      { key: 'name', label: 'Full Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'license_number', label: 'Commercial Licence' },
      { key: 'license_expiry', label: 'Licence Expiry' },
      { key: 'assigned_bus', label: 'Assigned Vehicle' },
      { key: 'status', label: 'Status' },
      { key: 'today_availability', label: 'Today Availability' },
      { key: 'safety_score', label: 'Safety Score' },
      { key: 'total_trips', label: 'Total Completed Trips' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#00C2FF]" />
            Driver Management & Safety
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track commercial licences, safety compliance ratings, route dispatches, and daily availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Roster
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Onboard Driver
          </button>
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
            placeholder="Search by driver name, phone, licence..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#08111F] p-1 rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto">
          {['all', 'available', 'on_trip', 'off_duty'].map((av) => (
            <button
              key={av}
              onClick={() => setAvailabilityFilter(av)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                availabilityFilter === av
                  ? 'bg-[#00C2FF] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {av.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedDrivers.map((driver) => {
          const isLicenceExpiringSoon = new Date(driver.license_expiry) < new Date('2026-11-01');

          return (
            <div
              key={driver.id}
              className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 hover:border-[#00C2FF]/30 transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center font-bold text-white text-base shadow-lg shadow-blue-500/10">
                      {driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-white font-heading text-sm group-hover:text-[#00C2FF] transition-colors">
                        {driver.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">{driver.phone}</p>
                    </div>
                  </div>
                  <StatusBadge status={driver.today_availability} size="sm" />
                </div>

                {/* Details List */}
                <div className="space-y-2 text-xs pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-slate-500" />
                      Assigned Bus:
                    </span>
                    <span className="font-semibold text-white">{driver.assigned_bus || 'Standby Pool'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      Safety Score:
                    </span>
                    <span className="font-bold text-emerald-400">{driver.safety_score}%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Licence Expiry:
                    </span>
                    <span className={`font-medium ${isLicenceExpiringSoon ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                      {formatDate(driver.license_expiry)}
                    </span>
                  </div>
                </div>

                {isLicenceExpiringSoon && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>Licence renewal required in &lt; 3 weeks.</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                <span className="text-[11px] text-slate-400 font-medium">
                  {driver.total_trips} trips ({formatDistance(driver.distance_km)})
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingDriver(driver)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#00C2FF] hover:bg-white/5 transition-colors"
                    title="View Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(driver)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Edit Driver"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingDriverId(driver.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove Driver"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-4 bg-[#0B1F3A] rounded-2xl border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {filteredDrivers.length} registered commercial drivers</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg bg-[#08111F] text-slate-300 disabled:opacity-40 hover:text-white transition-colors"
          >
            Previous
          </button>
          <span className="px-2 font-bold text-white">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg bg-[#08111F] text-slate-300 disabled:opacity-40 hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT DRIVER MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingDriver ? `Edit Driver — ${editingDriver.name}` : 'Onboard Commercial Driver'}
        subtitle="Licence verification, contact profile, and route dispatch availability."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98201 12345"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Commercial Licence # *</label>
              <input
                type="text"
                required
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="e.g. MH12 2018001928"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Licence Expiry Date</label>
              <input
                type="date"
                value={formData.license_expiry}
                onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Assigned Bus</label>
              <select
                value={formData.assigned_bus}
                onChange={(e) => setFormData({ ...formData, assigned_bus: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="">None (Standby Pool)</option>
                {buses.map(b => (
                  <option key={b.id} value={b.bus_number}>{b.bus_number} — {b.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Availability</label>
              <select
                value={formData.today_availability}
                onChange={(e) => setFormData({ ...formData, today_availability: e.target.value as DriverAvailability })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="available">Available</option>
                <option value="on_trip">On Trip</option>
                <option value="off_duty">Off Duty</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Safety Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.safety_score}
                onChange={(e) => setFormData({ ...formData, safety_score: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Emergency Contact</label>
            <input
              type="text"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              placeholder="e.g. +91 98201 99881 (Sunita - Spouse)"
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
              {editingDriver ? 'Save Changes' : 'Onboard Driver'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW DRIVER MODAL */}
      {viewingDriver && (
        <Modal
          isOpen={Boolean(viewingDriver)}
          onClose={() => setViewingDriver(null)}
          title={`Driver Profile — ${viewingDriver.name}`}
          subtitle={`Commercial Badge #${viewingDriver.license_number}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#08111F] border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center font-bold text-white text-xl">
                {viewingDriver.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">{viewingDriver.name}</h3>
                  <StatusBadge status={viewingDriver.today_availability} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{viewingDriver.experience_years} Years Commercial Driving Experience</p>
                <p className="text-xs text-emerald-400 font-semibold mt-1">Safety Rating: {viewingDriver.safety_score} / 100</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <p className="text-[11px] text-slate-400">Total Trips</p>
                <p className="text-sm font-bold text-white mt-1">{viewingDriver.total_trips}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <p className="text-[11px] text-slate-400">Total Distance</p>
                <p className="text-sm font-bold text-white mt-1">{formatDistance(viewingDriver.distance_km)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <p className="text-[11px] text-slate-400">Assigned Coach</p>
                <p className="text-sm font-bold text-white mt-1">{viewingDriver.assigned_bus || 'Standby'}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs p-4 rounded-xl bg-[#08111F] border border-white/5">
              <h4 className="font-bold text-slate-300 font-heading uppercase tracking-wider mb-2">Licence & Compliance Records</h4>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Licence Number:</span>
                <span className="font-mono text-white">{viewingDriver.license_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Licence Expiry:</span>
                <span className="font-semibold text-white">{formatDate(viewingDriver.license_expiry)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Onboarded Since:</span>
                <span className="text-white">{formatDate(viewingDriver.joining_date)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Emergency Contact:</span>
                <span className="text-white">{viewingDriver.emergency_contact || 'None registered'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingDriverId)}
        onClose={() => setDeletingDriverId(null)}
        onConfirm={() => {
          if (deletingDriverId) deleteDriver(deletingDriverId);
        }}
        title="Remove Driver"
        message="Are you sure you want to remove this driver from active roster? Their trip logs will be preserved."
        confirmLabel="Confirm Remove"
      />
    </div>
  );
};
