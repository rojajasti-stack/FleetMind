import React, { useState, useEffect, useRef } from 'react';
import {
  Compass, Search, Navigation, Battery, Fuel, Gauge, Clock,
  MapPin, Radio, Shield, AlertCircle
} from 'lucide-react';
import L from 'leaflet';
import { useFleetData } from '../hooks/useFleetData';
import { GpsVehicle } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';

export const GpsTrackingPage: React.FC = () => {
  const { gpsVehicles } = useFleetData();
  const [selectedVehicle, setSelectedVehicle] = useState<GpsVehicle>(gpsVehicles[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const filteredVehicles = gpsVehicles.filter(v => {
    const matchesSearch = v.bus_number.toLowerCase().includes(search.toLowerCase()) ||
                          v.driver_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Map centered around India (Expressway grid)
      const map = L.map(mapContainerRef.current, {
        center: [selectedVehicle.lat, selectedVehicle.lng],
        zoom: 7,
        zoomControl: true,
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Add marker for each vehicle
    filteredVehicles.forEach((veh) => {
      const isSelected = selectedVehicle && selectedVehicle.bus_id === veh.bus_id;

      // Custom HTML Marker Pin
      const iconHtml = `
        <div style="
          width: 34px;
          height: 34px;
          background: ${veh.status === 'active' ? '#00C2FF' : veh.status === 'maintenance' ? '#F59E0B' : '#64748B'};
          border: 3px solid #08111F;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #08111F;
          font-weight: 800;
          font-size: 10px;
          box-shadow: 0 0 15px ${veh.status === 'active' ? 'rgba(0,194,255,0.7)' : 'rgba(245,158,11,0.5)'};
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s;
        ">
          ${veh.bus_number.replace('FM-', '')}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-bus-pin',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([veh.lat, veh.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #fff; padding: 4px;">
            <b style="color: #00C2FF; font-size: 13px;">${veh.bus_number}</b><br/>
            <span>Model: ${veh.model}</span><br/>
            <span>Driver: ${veh.driver_name}</span><br/>
            <span>Speed: <b>${veh.speed} km/h</b></span><br/>
            <span style="color: #94A3B8;">Route: ${veh.current_route || 'Intercity'}</span>
          </div>
        `);

      marker.on('click', () => {
        setSelectedVehicle(veh);
      });

      markersRef.current[veh.bus_id] = marker;
    });

    // Pan to selected vehicle
    if (selectedVehicle) {
      map.panTo([selectedVehicle.lat, selectedVehicle.lng], { animate: true });
    }
  }, [filteredVehicles, selectedVehicle]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-[#00C2FF]" />
            Live GPS Telematics & Fleet Tracking
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time geospatial vehicle location transponders, speeds, and route progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Telematics Transponders Active
          </span>
        </div>
      </div>

      {/* Main Map + Vehicle Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[720px]">
        {/* Vehicles Selection Sidebar */}
        <div className="bg-[#0F2742] rounded-2xl border border-white/5 flex flex-col overflow-hidden">
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-white/5 space-y-3 bg-[#0B1F3A]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracked vehicle or driver..."
                className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#08111F] p-1 rounded-xl border border-white/10">
              {['all', 'active', 'maintenance'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 text-[11px] font-semibold capitalize rounded-lg transition-colors ${
                    statusFilter === st
                      ? 'bg-[#00C2FF] text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
            {filteredVehicles.map((veh) => {
              const isSelected = selectedVehicle && selectedVehicle.bus_id === veh.bus_id;

              return (
                <div
                  key={veh.bus_id}
                  onClick={() => setSelectedVehicle(veh)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600/30 to-[#00C2FF]/20 border border-[#00C2FF]/40 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-heading">{veh.bus_number}</span>
                        <StatusBadge status={veh.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{veh.driver_name}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-[#00C2FF] flex items-center justify-end gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        {veh.speed} km/h
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">{veh.last_updated}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/5">
                    <span className="truncate max-w-[150px]">{veh.current_route || 'Depot'}</span>
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <Fuel className="w-3 h-3 text-orange-400" /> {veh.fuel_level > 0 ? `${veh.fuel_level}%` : 'EV Mode'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Map Display & Telemetry Card (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Leaflet Map Box */}
          <div className="flex-1 bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden relative shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

            {/* Note badge */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-[#0B1F3A]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00C2FF]" />
              Simulated demonstration telematics coordinates
            </div>
          </div>

          {/* Selected Vehicle Live Telemetry Panel */}
          {selectedVehicle && (
            <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Vehicle Code</span>
                <span className="text-sm font-bold text-white mt-1 block font-heading">{selectedVehicle.bus_number}</span>
                <span className="text-[11px] text-slate-400 truncate block">{selectedVehicle.model}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Current Velocity</span>
                <span className="text-sm font-bold text-[#00C2FF] mt-1 block font-mono">{selectedVehicle.speed} km/h</span>
                <span className="text-[11px] text-emerald-400 font-medium">Within safe limit</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Fuel / Battery</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {selectedVehicle.fuel_level > 0 ? `${selectedVehicle.fuel_level}% Diesel` : `${selectedVehicle.battery_level}% Battery`}
                </span>
                <span className="text-[11px] text-slate-400">Aux Battery: {selectedVehicle.battery_level}%</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Destination</span>
                <span className="text-sm font-bold text-white mt-1 block truncate">{selectedVehicle.destination || 'Terminus'}</span>
                <span className="text-[11px] text-slate-400 truncate block">Driver: {selectedVehicle.driver_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
