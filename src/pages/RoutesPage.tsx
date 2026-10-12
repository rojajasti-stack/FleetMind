import React, { useState } from 'react';
import {
  Route as RouteIcon, Search, Plus, Download, Edit2, Trash2,
  MapPin, Clock, ArrowRight, Bus, Users, DollarSign
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { Route } from '../types';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { exportToCsv } from '../utils/exportCsv';
import { formatCurrency } from '../utils/formatters';

export const RoutesPage: React.FC = () => {
  const { routes, addRoute, updateRoute, deleteRoute, buses, drivers } = useFleetData();

  const [search, setSearch] = useState('');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);

  const initialFormState: Omit<Route, 'id'> = {
    route_name: '',
    route_code: '',
    start_point: '',
    end_point: '',
    distance_km: 150,
    estimated_time: '3h 30m',
    fare: 450,
    assigned_buses: [],
    assigned_drivers: [],
    stops: [],
    status: 'active'
  };

  const [formData, setFormData] = useState<Omit<Route, 'id'>>(initialFormState);
  const [stopsText, setStopsText] = useState('');

  const filteredRoutes = routes.filter(r =>
    r.route_name.toLowerCase().includes(search.toLowerCase()) ||
    r.route_code.toLowerCase().includes(search.toLowerCase()) ||
    r.start_point.toLowerCase().includes(search.toLowerCase()) ||
    r.end_point.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setFormData(initialFormState);
    setStopsText('');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (r: Route) => {
    setEditingRoute(r);
    setFormData({
      route_name: r.route_name,
      route_code: r.route_code,
      start_point: r.start_point,
      end_point: r.end_point,
      distance_km: r.distance_km,
      estimated_time: r.estimated_time,
      fare: r.fare,
      assigned_buses: r.assigned_buses || [],
      assigned_drivers: r.assigned_drivers || [],
      stops: r.stops || [],
      status: r.status
    });
    setStopsText((r.stops || []).join(', '));
    setIsAddEditOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.route_name || !formData.route_code) {
      alert('Route name and route code are required.');
      return;
    }

    const stopsArray = stopsText.split(',').map(s => s.trim()).filter(Boolean);
    const payload = { ...formData, stops: stopsArray };

    if (editingRoute) {
      updateRoute(editingRoute.id, payload);
    } else {
      addRoute(payload);
    }
    setIsAddEditOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(routes, 'FleetMind_Routes_List', [
      { key: 'route_code', label: 'Route Code' },
      { key: 'route_name', label: 'Route Name' },
      { key: 'start_point', label: 'Origin' },
      { key: 'end_point', label: 'Destination' },
      { key: 'distance_km', label: 'Distance (km)' },
      { key: 'estimated_time', label: 'Duration' },
      { key: 'fare', label: 'Fare (₹)' },
      { key: 'status', label: 'Status' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <RouteIcon className="w-6 h-6 text-[#00C2FF]" />
            Route Management & Corridors
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure intercity corridors, intermediate stops, passenger fares, and assigned coaches.
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
            New Route
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-[#0F2742] rounded-2xl p-4 border border-white/5 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by route code, city, or terminus..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline-block">
          {filteredRoutes.length} Active Corridors
        </span>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRoutes.map((route) => (
          <div
            key={route.id}
            className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 hover:border-[#00C2FF]/30 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/20">
                      {route.route_code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      {route.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-1.5 font-heading group-hover:text-[#00C2FF] transition-colors">
                    {route.route_name}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-white font-mono">{formatCurrency(route.fare)}</span>
                  <p className="text-[10px] text-slate-400">Base Fare / Seat</p>
                </div>
              </div>

              {/* Path Visual */}
              <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-white">{route.start_point}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-semibold text-white">{route.end_point}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#00C2FF]" /> {route.estimated_time}
                  </span>
                  <span>{route.distance_km} km Total Distance</span>
                </div>
              </div>

              {/* Intermediate Stops */}
              {route.stops && route.stops.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold mb-1.5">Scheduled Intermediate Stops:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {route.stops.map((stop, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 text-slate-300 border border-white/5">
                        {stop}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5" /> {(route.assigned_buses || []).length} Coaches
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {(route.assigned_drivers || []).length} Drivers
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(route)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Edit Route"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingRouteId(route.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Route"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingRoute ? `Edit Route — ${editingRoute.route_code}` : 'Configure New Transport Route'}
        subtitle="Specify terminal stops, travel distance, passenger ticket fare, and bus assignments."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Route Code *</label>
              <input
                type="text"
                required
                value={formData.route_code}
                onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                placeholder="e.g. EXP-606"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Route Name *</label>
              <input
                type="text"
                required
                value={formData.route_name}
                onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                placeholder="e.g. Pune - Goa Coastal Expressway"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Origin Terminus *</label>
              <input
                type="text"
                required
                value={formData.start_point}
                onChange={(e) => setFormData({ ...formData, start_point: e.target.value })}
                placeholder="e.g. Pune Swargate"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Destination Terminus *</label>
              <input
                type="text"
                required
                value={formData.end_point}
                onChange={(e) => setFormData({ ...formData, end_point: e.target.value })}
                placeholder="e.g. Panaji KTC Bus Stand"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Distance (km)</label>
              <input
                type="number"
                value={formData.distance_km}
                onChange={(e) => setFormData({ ...formData, distance_km: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Estimated Duration</label>
              <input
                type="text"
                value={formData.estimated_time}
                onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                placeholder="e.g. 8h 15m"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Seat Fare (₹)</label>
              <input
                type="number"
                value={formData.fare}
                onChange={(e) => setFormData({ ...formData, fare: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Intermediate Stops (comma-separated)</label>
            <input
              type="text"
              value={stopsText}
              onChange={(e) => setStopsText(e.target.value)}
              placeholder="e.g. Satara Highway, Karad Toll, Kolhapur Bypass, Sawantwadi"
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
              {editingRoute ? 'Save Changes' : 'Create Route'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={Boolean(deletingRouteId)}
        onClose={() => setDeletingRouteId(null)}
        onConfirm={() => {
          if (deletingRouteId) deleteRoute(deletingRouteId);
        }}
        title="Delete Transport Route"
        message="Are you sure you want to deactivate and remove this transport route corridor?"
      />
    </div>
  );
};
