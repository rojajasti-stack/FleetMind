import React, { useState } from 'react';
import {
  Bus as BusIcon, Search, Plus, Filter, Download, Edit2, Trash2,
  Eye, CheckCircle, AlertTriangle, Shield, Calendar, Fuel, Gauge, User, FileText
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { Bus, VehicleStatus, FuelType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate, formatDistance } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const BusesPage: React.FC = () => {
  const { buses, addBus, updateBus, deleteBus, drivers, trips, serviceRecords, fuelRecords } = useFleetData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [viewingBus, setViewingBus] = useState<Bus | null>(null);
  const [viewTab, setViewTab] = useState<'info' | 'trips' | 'maintenance' | 'fuel'>('info');
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);

  // Form State
  const initialFormState: Omit<Bus, 'id'> = {
    bus_number: '',
    registration_number: '',
    model: '',
    manufacturer: '',
    year: 2023,
    capacity: 45,
    status: 'active',
    fuel_type: 'Diesel',
    odometer: 0,
    assigned_driver: '',
    route: '',
    insurance_expiry: '2027-01-01',
    registration_expiry: '2028-01-01',
    last_service_date: '2026-09-01',
    next_service_date: '2026-12-01',
    notes: '',
  };

  const [formData, setFormData] = useState<Omit<Bus, 'id'>>(initialFormState);

  // Filter & Search
  const filteredBuses = buses.filter(bus => {
    const matchesSearch =
      bus.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      bus.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      bus.model.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bus.status === statusFilter;
    const matchesFuel = fuelFilter === 'all' || bus.fuel_type === fuelFilter;
    return matchesSearch && matchesStatus && matchesFuel;
  });

  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage) || 1;
  const paginatedBuses = filteredBuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAdd = () => {
    setEditingBus(null);
    setFormData(initialFormState);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      bus_number: bus.bus_number,
      registration_number: bus.registration_number,
      model: bus.model,
      manufacturer: bus.manufacturer,
      year: bus.year,
      capacity: bus.capacity,
      status: bus.status,
      fuel_type: bus.fuel_type,
      odometer: bus.odometer,
      assigned_driver: bus.assigned_driver || '',
      route: bus.route || '',
      insurance_expiry: bus.insurance_expiry,
      registration_expiry: bus.registration_expiry,
      last_service_date: bus.last_service_date,
      next_service_date: bus.next_service_date,
      notes: bus.notes || '',
    });
    setIsAddEditOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bus_number || !formData.registration_number) {
      alert('Bus Number and Registration Number are required.');
      return;
    }

    if (editingBus) {
      updateBus(editingBus.id, formData);
    } else {
      addBus(formData);
    }
    setIsAddEditOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(buses, 'FleetMind_Vehicles_List', [
      { key: 'bus_number', label: 'Bus ID' },
      { key: 'registration_number', label: 'Plate Number' },
      { key: 'model', label: 'Model' },
      { key: 'capacity', label: 'Seats' },
      { key: 'fuel_type', label: 'Fuel' },
      { key: 'status', label: 'Status' },
      { key: 'odometer', label: 'Odometer (km)' },
      { key: 'assigned_driver', label: 'Driver' },
      { key: 'route', label: 'Route' },
      { key: 'next_service_date', label: 'Next Service' },
      { key: 'insurance_expiry', label: 'Insurance Expiry' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <BusIcon className="w-6 h-6 text-[#00C2FF]" />
            Bus Fleet Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage commercial coaches, maintenance logs, telematics odometer, and driver assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add New Vehicle
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#0F2742] rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Bus #, plate or model..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#08111F] p-1 rounded-xl border border-white/10">
            {['all', 'active', 'maintenance', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-[#00C2FF] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Fuel Filter */}
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="bg-[#08111F] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#00C2FF]/50"
          >
            <option value="all">All Fuels</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
            <option value="CNG">CNG</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-5 py-4">Vehicle / Reg #</th>
                <th className="px-5 py-4">Model & Make</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Fuel & Odometer</th>
                <th className="px-5 py-4">Assigned Driver</th>
                <th className="px-5 py-4">Next Service</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-xs">
                    No vehicles found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedBuses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#00C2FF] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20">
                          {bus.bus_number.split('-')[1] || bus.bus_number}
                        </div>
                        <div>
                          <p className="font-bold text-white font-heading text-sm">{bus.bus_number}</p>
                          <p className="text-[11px] text-slate-400 font-mono tracking-wider">{bus.registration_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-200">{bus.model}</p>
                      <p className="text-[11px] text-slate-400">{bus.capacity} Seats • {bus.manufacturer}</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={bus.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-200">{bus.fuel_type}</span>
                      <p className="text-[11px] text-slate-400">{formatDistance(bus.odometer)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-200">{bus.assigned_driver || 'Unassigned'}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{bus.route || 'Standby'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-200">{formatDate(bus.next_service_date)}</p>
                      {new Date(bus.next_service_date) < new Date('2026-10-12') && (
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Overdue</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setViewingBus(bus);
                            setViewTab('info');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#00C2FF] hover:bg-white/5 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="Edit Vehicle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingBusId(bus.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-[#0B1F3A] border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {filteredBuses.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredBuses.length)} of {filteredBuses.length} vehicles
          </span>
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
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingBus ? `Edit Vehicle — ${editingBus.bus_number}` : 'Add New Fleet Vehicle'}
        subtitle="Configure vehicle specifications, compliance dates, and driver assignment."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Bus ID / Code *</label>
              <input
                type="text"
                required
                value={formData.bus_number}
                onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                placeholder="e.g. FM-109"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Registration Number *</label>
              <input
                type="text"
                required
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="e.g. MH-12-AB-1234"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Model Name</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. Volvo 9600 B11R"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g. Volvo Buses / Tata Motors"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Fuel Type</label>
              <select
                value={formData.fuel_type}
                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as FuelType })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="CNG">CNG</option>
                <option value="Petrol">Petrol</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Passenger Capacity</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Fleet Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Odometer (km)</label>
              <input
                type="number"
                value={formData.odometer}
                onChange={(e) => setFormData({ ...formData, odometer: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Assign Driver</label>
              <select
                value={formData.assigned_driver}
                onChange={(e) => setFormData({ ...formData, assigned_driver: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="">Unassigned</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.name}>{d.name} ({d.today_availability})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Next Service Date</label>
              <input
                type="date"
                value={formData.next_service_date}
                onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Insurance Expiry Date</label>
              <input
                type="date"
                value={formData.insurance_expiry}
                onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Notes / Specifications</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Suspension type, telematics transponder id, warranty notes..."
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
              {editingBus ? 'Save Changes' : 'Add Vehicle to Fleet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW VEHICLE DETAILS MODAL */}
      {viewingBus && (
        <Modal
          isOpen={Boolean(viewingBus)}
          onClose={() => setViewingBus(null)}
          title={`Vehicle Profile — ${viewingBus.bus_number}`}
          subtitle={`${viewingBus.model} (${viewingBus.registration_number})`}
          maxWidth="max-w-3xl"
        >
          {/* Subtabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-6">
            {[
              { id: 'info', label: 'Vehicle Specs' },
              { id: 'trips', label: 'Trip History' },
              { id: 'maintenance', label: 'Maintenance' },
              { id: 'fuel', label: 'Fuel Records' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewTab === tab.id
                    ? 'bg-[#00C2FF] text-slate-950'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5">
                  <p className="text-[11px] text-slate-400">Current Status</p>
                  <div className="mt-1"><StatusBadge status={viewingBus.status} /></div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5">
                  <p className="text-[11px] text-slate-400">Odometer</p>
                  <p className="text-sm font-bold text-white mt-1">{formatDistance(viewingBus.odometer)}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5">
                  <p className="text-[11px] text-slate-400">Fuel Type</p>
                  <p className="text-sm font-bold text-white mt-1">{viewingBus.fuel_type}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5">
                  <p className="text-[11px] text-slate-400">Capacity</p>
                  <p className="text-sm font-bold text-white mt-1">{viewingBus.capacity} Passengers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#08111F] border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 font-heading uppercase tracking-wider">Compliance & Dates</h4>
                  <div className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-slate-400">Next Scheduled Service</span>
                    <span className="font-semibold text-white">{formatDate(viewingBus.next_service_date)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-slate-400">Insurance Expiry</span>
                    <span className="font-semibold text-white">{formatDate(viewingBus.insurance_expiry)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-400">Registration Expiry</span>
                    <span className="font-semibold text-white">{formatDate(viewingBus.registration_expiry)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#08111F] border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 font-heading uppercase tracking-wider">Operations Assignment</h4>
                  <div className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-slate-400">Assigned Driver</span>
                    <span className="font-semibold text-white">{viewingBus.assigned_driver || 'None'}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-slate-400">Route Assigned</span>
                    <span className="font-semibold text-white">{viewingBus.route || 'Standby Fleet'}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-400">Manufacturing Year</span>
                    <span className="font-semibold text-white">{viewingBus.year}</span>
                  </div>
                </div>
              </div>

              {viewingBus.notes && (
                <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5 text-xs">
                  <p className="text-slate-400 font-semibold mb-1">Equipment Notes:</p>
                  <p className="text-slate-300">{viewingBus.notes}</p>
                </div>
              )}
            </div>
          )}

          {viewTab === 'trips' && (
            <div className="space-y-3">
              {trips.filter(t => t.bus_number === viewingBus.bus_number).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No recorded trip dispatches for this vehicle.</p>
              ) : (
                trips.filter(t => t.bus_number === viewingBus.bus_number).map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{t.trip_code} • {t.route_name}</p>
                      <p className="text-slate-400 mt-0.5">{formatDate(t.date)} ({t.start_time} - {t.end_time})</p>
                    </div>
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                ))
              )}
            </div>
          )}

          {viewTab === 'maintenance' && (
            <div className="space-y-3">
              {serviceRecords.filter(s => s.bus_number === viewingBus.bus_number).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No maintenance records found for this vehicle.</p>
              ) : (
                serviceRecords.filter(s => s.bus_number === viewingBus.bus_number).map((s) => (
                  <div key={s.id} className="p-3.5 rounded-xl bg-[#08111F] border border-white/5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white capitalize">{s.service_type.replace('_', ' ')}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <p className="text-slate-300">{s.mechanic_notes}</p>
                    <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                      <span>Mechanic: {s.mechanic_name}</span>
                      <span className="font-semibold text-emerald-400">₹{s.cost.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {viewTab === 'fuel' && (
            <div className="space-y-3">
              {fuelRecords.filter(f => f.bus_number === viewingBus.bus_number).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No fuel logs found for this vehicle.</p>
              ) : (
                fuelRecords.filter(f => f.bus_number === viewingBus.bus_number).map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{f.liters} Litres @ ₹{f.price_per_liter}/L</p>
                      <p className="text-slate-400">{f.fuel_station} ({formatDate(f.date)})</p>
                    </div>
                    <span className="font-bold text-[#00C2FF]">₹{f.amount.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingBusId)}
        onClose={() => setDeletingBusId(null)}
        onConfirm={() => {
          if (deletingBusId) deleteBus(deletingBusId);
        }}
        title="Delete Vehicle From Fleet"
        message="Are you sure you want to remove this vehicle? This action will archive historical telematics links."
        confirmLabel="Confirm Delete"
      />
    </div>
  );
};
