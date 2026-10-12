import React, { useState } from 'react';
import {
  Fuel, Search, Plus, Download, Edit2, Trash2, Gauge,
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { useFleetData } from '../hooks/useFleetData';
import { FuelRecord } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const FuelPage: React.FC = () => {
  const { fuelRecords, addFuelRecord, deleteFuelRecord, buses, drivers } = useFleetData();

  const [search, setSearch] = useState('');
  const [selectedBusFilter, setSelectedBusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingFuelId, setDeletingFuelId] = useState<string | null>(null);

  // Form State
  const initialFormState: Omit<FuelRecord, 'id'> = {
    bus_number: buses[0]?.bus_number || 'FM-101',
    date: new Date().toISOString().split('T')[0],
    liters: 100,
    amount: 9000,
    price_per_liter: 90,
    odometer_reading: 85000,
    fuel_station: 'Indian Oil Highway Hub',
    driver_name: drivers[0]?.name || 'Rajesh Kumar',
    receipt_number: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
    notes: 'Tank filled to auto-cutoff.'
  };

  const [formData, setFormData] = useState<Omit<FuelRecord, 'id'>>(initialFormState);

  // Calculations
  const totalLiters = fuelRecords.reduce((acc, f) => acc + f.liters, 0);
  const totalFuelExpenses = fuelRecords.reduce((acc, f) => acc + f.amount, 0);
  const avgPricePerLiter = totalLiters > 0 ? Math.round(totalFuelExpenses / totalLiters) : 90;

  const validEfficiencies = fuelRecords.filter(f => f.calculated_efficiency && f.calculated_efficiency > 0);
  const avgEfficiency = validEfficiencies.length > 0
    ? (validEfficiencies.reduce((acc, f) => acc + (f.calculated_efficiency || 0), 0) / validEfficiencies.length).toFixed(1)
    : '4.8';

  const filteredFuel = fuelRecords.filter(f => {
    const matchesSearch =
      f.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      f.fuel_station.toLowerCase().includes(search.toLowerCase()) ||
      f.driver_name.toLowerCase().includes(search.toLowerCase());
    const matchesBus = selectedBusFilter === 'all' || f.bus_number === selectedBusFilter;
    return matchesSearch && matchesBus;
  });

  const busFuelAgg = buses.map(b => {
    const records = fuelRecords.filter(f => f.bus_number === b.bus_number);
    const sumLiters = records.reduce((acc, f) => acc + f.liters, 0);
    const sumAmount = records.reduce((acc, f) => acc + f.amount, 0);
    return {
      name: b.bus_number,
      liters: sumLiters,
      amount: sumAmount
    };
  }).filter(b => b.liters > 0);

  const handleLitersOrPriceChange = (liters: number, price: number) => {
    setFormData(prev => ({
      ...prev,
      liters,
      price_per_liter: price,
      amount: Math.round(liters * price)
    }));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    addFuelRecord(formData);
    setIsAddOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(fuelRecords, 'FleetMind_Fuel_Logs', [
      { key: 'bus_number', label: 'Vehicle' },
      { key: 'date', label: 'Date' },
      { key: 'liters', label: 'Quantity (L)' },
      { key: 'price_per_liter', label: 'Price/L (₹)' },
      { key: 'amount', label: 'Total Cost (₹)' },
      { key: 'fuel_station', label: 'Fuel Station' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'odometer_reading', label: 'Odometer (km)' },
      { key: 'calculated_efficiency', label: 'Efficiency (km/L)' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Fuel className="w-6 h-6 text-[#00C2FF]" />
            Fuel Telematics & Consumption Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track pump receipts, calculate fleet-wide km/L efficiency, identify anomalies, and control operating fuel costs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Fuel Logs
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Record Fuel Entry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Fuel Expenses"
          value={formatCurrency(totalFuelExpenses)}
          icon={Fuel}
          change="Updated live"
          changeType="neutral"
          subtext="Monthly operating cost"
          iconColor="text-orange-400"
        />
        <StatCard
          label="Total Liters Pumped"
          value={`${totalLiters.toLocaleString()} L`}
          icon={Gauge}
          change="+8% vs target"
          changeType="positive"
          subtext="Diesel & CNG equivalents"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Average Price / Liter"
          value={`₹${avgPricePerLiter}`}
          icon={TrendingDown}
          change="Regulated NHAI rates"
          changeType="neutral"
          subtext="IOCL / BPCL / HPCL"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Fleet Avg Efficiency"
          value={`${avgEfficiency} km/L`}
          icon={TrendingUp}
          change="Healthy benchmark"
          changeType="positive"
          subtext="Category standard: 4.5"
          iconColor="text-[#00C2FF]"
        />
      </div>

      {/* Fuel Consumption Bar Chart */}
      <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-heading">Vehicle Fuel Consumption Breakdown</h3>
            <p className="text-xs text-slate-400">Total liters logged per commercial bus</p>
          </div>
          <span className="text-xs font-medium text-[#00C2FF] bg-[#00C2FF]/10 px-2 py-1 rounded-lg">
            Litres vs Total Spent
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={busFuelAgg}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                formatter={(val: any, name: any) => name === 'amount' ? formatCurrency(Number(val)) : `${val} Litres`}
                contentStyle={{ backgroundColor: '#0B1F3A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="liters" fill="#00C2FF" radius={[6, 6, 0, 0]} name="Liters" />
              <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Total Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0B1F3A]">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fuel station, driver, bus..."
              className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedBusFilter}
              onChange={(e) => setSelectedBusFilter(e.target.value)}
              className="bg-[#08111F] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#00C2FF]/50"
            >
              <option value="all">All Vehicles</option>
              {buses.map(b => (
                <option key={b.id} value={b.bus_number}>{b.bus_number}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Quantity & Rate</th>
                <th className="px-5 py-4">Total Amount</th>
                <th className="px-5 py-4">Fuel Station & Driver</th>
                <th className="px-5 py-4">Efficiency</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredFuel.map((record) => {
                const isAnomaly = record.calculated_efficiency && record.calculated_efficiency < 4.4;

                return (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-bold text-white font-heading text-sm">{record.bus_number}</span>
                      <p className="text-[11px] text-slate-400">Odo: {record.odometer_reading.toLocaleString()} km</p>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{formatDate(record.date)}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{record.liters} Litres</p>
                      <p className="text-[11px] text-slate-400">@ ₹{record.price_per_liter}/L</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-[#00C2FF] font-mono text-sm">{formatCurrency(record.amount)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-200">{record.fuel_station}</p>
                      <p className="text-[11px] text-slate-400">By: {record.driver_name}</p>
                    </td>
                    <td className="px-5 py-4">
                      {record.calculated_efficiency ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold font-mono ${isAnomaly ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {record.calculated_efficiency} km/L
                          </span>
                          {isAnomaly && (
                            <span title="Lower than expected benchmark" className="text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setDeletingFuelId(record.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD FUEL MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Commercial Fuel Purchase"
        subtitle="Automatic amount calculation (Quantity × Price/L) and financial ledger entry."
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
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Purchase Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Liters (Quantity)</label>
              <input
                type="number"
                required
                value={formData.liters}
                onChange={(e) => handleLitersOrPriceChange(Number(e.target.value), formData.price_per_liter)}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Price / Liter (₹)</label>
              <input
                type="number"
                required
                value={formData.price_per_liter}
                onChange={(e) => handleLitersOrPriceChange(formData.liters, Number(e.target.value))}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Calculated Total (₹)</label>
              <input
                type="number"
                readOnly
                value={formData.amount}
                className="w-full bg-[#08111F]/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#00C2FF] font-bold font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Fuel Station</label>
              <input
                type="text"
                required
                value={formData.fuel_station}
                onChange={(e) => setFormData({ ...formData, fuel_station: e.target.value })}
                placeholder="e.g. Bharat Petroleum COCO Highway"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Driver</label>
              <select
                value={formData.driver_name}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Odometer Reading (km)</label>
              <input
                type="number"
                value={formData.odometer_reading}
                onChange={(e) => setFormData({ ...formData, odometer_reading: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Receipt / Bill #</label>
              <input
                type="text"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                placeholder="e.g. IOC-88219"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              Save Fuel Record
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={Boolean(deletingFuelId)}
        onClose={() => setDeletingFuelId(null)}
        onConfirm={() => {
          if (deletingFuelId) deleteFuelRecord(deletingFuelId);
        }}
        title="Delete Fuel Record"
        message="Are you sure you want to remove this fuel log entry?"
      />
    </div>
  );
};
