import React, { useState } from 'react';
import {
  CalendarClock, Search, Plus, Filter, Download, Edit2, Trash2,
  Clock, Bus, User, MapPin, CheckCircle, AlertTriangle, XCircle
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { Trip, TripStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate, formatCurrency } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const TripsPage: React.FC = () => {
  const { trips, addTrip, updateTrip, deleteTrip, buses, drivers, routes } = useFleetData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const initialFormState: Omit<Trip, 'id'> = {
    trip_code: '',
    route_id: routes[0]?.id || '',
    route_name: routes[0]?.route_name || '',
    bus_id: buses[0]?.id || '',
    bus_number: buses[0]?.bus_number || '',
    driver_id: drivers[0]?.id || '',
    driver_name: drivers[0]?.name || '',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '12:00',
    start_point: routes[0]?.start_point || '',
    end_point: routes[0]?.end_point || '',
    fare: routes[0]?.fare || 500,
    passenger_count: 35,
    status: 'scheduled'
  };

  const [formData, setFormData] = useState<Omit<Trip, 'id'>>(initialFormState);

  const filteredTrips = trips.filter(t => {
    const matchesSearch =
      t.trip_code.toLowerCase().includes(search.toLowerCase()) ||
      t.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      t.driver_name.toLowerCase().includes(search.toLowerCase()) ||
      t.route_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage) || 1;
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAdd = () => {
    setEditingTrip(null);
    setErrorMessage('');
    const defaultRoute = routes[0];
    const defaultBus = buses.find(b => b.status === 'active') || buses[0];
    const defaultDriver = drivers.find(d => d.today_availability === 'available') || drivers[0];

    setFormData({
      ...initialFormState,
      trip_code: `TRP-${Math.floor(100 + Math.random() * 900)}`,
      route_id: defaultRoute?.id || '',
      route_name: defaultRoute?.route_name || '',
      start_point: defaultRoute?.start_point || '',
      end_point: defaultRoute?.end_point || '',
      fare: defaultRoute?.fare || 450,
      bus_id: defaultBus?.id || '',
      bus_number: defaultBus?.bus_number || '',
      driver_id: defaultDriver?.id || '',
      driver_name: defaultDriver?.name || '',
    });
    setIsAddEditOpen(true);
  };

  const handleRouteChange = (routeId: string) => {
    const r = routes.find(item => item.id === routeId);
    if (r) {
      setFormData(prev => ({
        ...prev,
        route_id: r.id,
        route_name: r.route_name,
        start_point: r.start_point,
        end_point: r.end_point,
        fare: r.fare,
      }));
    }
  };

  const handleBusChange = (busId: string) => {
    const b = buses.find(item => item.id === busId);
    if (b) {
      setFormData(prev => ({
        ...prev,
        bus_id: b.id,
        bus_number: b.bus_number
      }));
    }
  };

  const handleDriverChange = (driverId: string) => {
    const d = drivers.find(item => item.id === driverId);
    if (d) {
      setFormData(prev => ({
        ...prev,
        driver_id: d.id,
        driver_name: d.name
      }));
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (editingTrip) {
      updateTrip(editingTrip.id, formData);
      setIsAddEditOpen(false);
    } else {
      const res = addTrip(formData);
      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setIsAddEditOpen(false);
      }
    }
  };

  const handleUpdateStatus = (tripId: string, newStatus: TripStatus) => {
    updateTrip(tripId, { status: newStatus });
  };

  const handleExportCsv = () => {
    exportToCsv(trips, 'FleetMind_Trip_Dispatches', [
      { key: 'trip_code', label: 'Trip ID' },
      { key: 'date', label: 'Date' },
      { key: 'bus_number', label: 'Vehicle' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'route_name', label: 'Route Corridor' },
      { key: 'start_time', label: 'Departure' },
      { key: 'end_time', label: 'Arrival' },
      { key: 'status', label: 'Status' },
      { key: 'fare', label: 'Ticket Fare (₹)' },
      { key: 'passenger_count', label: 'Passengers' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-6 h-6 text-[#00C2FF]" />
            Trip Scheduling & Dispatch
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dispatch vehicles, assign licensed drivers, prevent schedule overlapping conflicts, and track completion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Dispatches
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Schedule Trip
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
            placeholder="Search trip code, bus, or driver..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#08111F] p-1 rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto">
          {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((st) => (
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

      {/* Trips Table */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-5 py-4">Trip Code</th>
                <th className="px-5 py-4">Vehicle & Driver</th>
                <th className="px-5 py-4">Route Corridor</th>
                <th className="px-5 py-4">Date & Time</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Fare & Seats</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold text-white font-heading text-sm">{trip.trip_code}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{trip.bus_number}</p>
                    <p className="text-[11px] text-slate-400">{trip.driver_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-200">{trip.route_name}</p>
                    <p className="text-[11px] text-slate-400">{trip.start_point} → {trip.end_point}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-200">{formatDate(trip.date)}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{trip.start_time} - {trip.end_time}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={trip.status} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-emerald-400">{formatCurrency(trip.fare)}</p>
                    <p className="text-[11px] text-slate-400">{trip.passenger_count || 0} passengers</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {trip.status === 'scheduled' && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, 'in_progress')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/20 hover:bg-[#00C2FF] hover:text-slate-950 transition-colors"
                        >
                          Dispatch
                        </button>
                      )}
                      {trip.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, 'completed')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingTripId(trip.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Cancel Trip"
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

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-[#0B1F3A] border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredTrips.length} scheduled intercity trips</span>
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

      {/* SCHEDULE TRIP MODAL WITH CONFLICT CHECK */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title="Schedule Intercity Trip"
        subtitle="Automatic conflict detection checks vehicle and driver availability."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Trip Code</label>
              <input
                type="text"
                required
                value={formData.trip_code}
                onChange={(e) => setFormData({ ...formData, trip_code: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Trip Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Select Route Corridor</label>
            <select
              value={formData.route_id}
              onChange={(e) => handleRouteChange(e.target.value)}
              className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
            >
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.route_code} — {r.route_name} ({r.distance_km} km)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Assign Vehicle</label>
              <select
                value={formData.bus_id}
                onChange={(e) => handleBusChange(e.target.value)}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {buses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bus_number} — {b.model} ({b.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Assign Driver</label>
              <select
                value={formData.driver_id}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.today_availability})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Departure Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Arrival Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Booked Passengers</label>
              <input
                type="number"
                value={formData.passenger_count}
                onChange={(e) => setFormData({ ...formData, passenger_count: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
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
              Confirm Dispatch
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM CANCELLATION */}
      <ConfirmDialog
        isOpen={Boolean(deletingTripId)}
        onClose={() => setDeletingTripId(null)}
        onConfirm={() => {
          if (deletingTripId) deleteTrip(deletingTripId);
        }}
        title="Cancel Trip Dispatch"
        message="Are you sure you want to cancel and remove this scheduled trip?"
        confirmLabel="Confirm Cancel"
      />
    </div>
  );
};
