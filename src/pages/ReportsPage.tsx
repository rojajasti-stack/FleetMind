import React, { useState } from 'react';
import {
  BarChart3, Download, Printer, Filter, Calendar, Bus, Users,
  Wrench, Fuel, Wallet, CreditCard, Compass, FileText
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { formatCurrency, formatDate, formatDistance } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

type ReportTab = 'utilization' | 'vehicles' | 'drivers' | 'maintenance' | 'fuel' | 'financial' | 'emi';

export const ReportsPage: React.FC = () => {
  const { buses, drivers, trips, fuelRecords, serviceRecords, expenses, loans } = useFleetData();

  const [activeTab, setActiveTab] = useState<ReportTab>('utilization');
  const [dateRange, setDateRange] = useState('month');

  const totalFuelAmount = fuelRecords.reduce((acc, f) => acc + f.amount, 0);
  const totalMaintAmount = serviceRecords.reduce((acc, s) => acc + s.cost, 0);
  const totalRevenue = expenses.filter(e => e.type === 'revenue').reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCurrentReport = () => {
    if (activeTab === 'vehicles') {
      exportToCsv(buses, 'FleetMind_Vehicle_Performance_Report', [
        { key: 'bus_number', label: 'Bus ID' },
        { key: 'registration_number', label: 'Plate Number' },
        { key: 'model', label: 'Model' },
        { key: 'fuel_type', label: 'Fuel' },
        { key: 'odometer', label: 'Odometer (km)' },
        { key: 'status', label: 'Status' },
        { key: 'assigned_driver', label: 'Driver' },
      ]);
    } else if (activeTab === 'drivers') {
      exportToCsv(drivers, 'FleetMind_Driver_Safety_Report', [
        { key: 'name', label: 'Driver Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'license_number', label: 'Licence' },
        { key: 'safety_score', label: 'Safety Score (%)' },
        { key: 'total_trips', label: 'Trips' },
        { key: 'distance_km', label: 'Distance (km)' },
      ]);
    } else if (activeTab === 'maintenance') {
      exportToCsv(serviceRecords, 'FleetMind_Maintenance_Report', [
        { key: 'bus_number', label: 'Vehicle' },
        { key: 'service_type', label: 'Service' },
        { key: 'service_date', label: 'Date' },
        { key: 'cost', label: 'Cost (₹)' },
        { key: 'mechanic_name', label: 'Mechanic' },
        { key: 'status', label: 'Status' },
      ]);
    } else if (activeTab === 'fuel') {
      exportToCsv(fuelRecords, 'FleetMind_Fuel_Report', [
        { key: 'bus_number', label: 'Vehicle' },
        { key: 'date', label: 'Date' },
        { key: 'liters', label: 'Liters' },
        { key: 'price_per_liter', label: 'Price/L (₹)' },
        { key: 'amount', label: 'Total (₹)' },
        { key: 'fuel_station', label: 'Station' },
      ]);
    } else if (activeTab === 'financial') {
      exportToCsv(expenses, 'FleetMind_Financial_Report', [
        { key: 'reference_number', label: 'Reference' },
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount (₹)' },
        { key: 'description', label: 'Description' },
      ]);
    } else if (activeTab === 'emi') {
      exportToCsv(loans, 'FleetMind_EMI_Loans_Report', [
        { key: 'loan_id', label: 'Loan ID' },
        { key: 'bus_number', label: 'Vehicle' },
        { key: 'lender', label: 'Financier' },
        { key: 'principal_amount', label: 'Principal (₹)' },
        { key: 'monthly_emi', label: 'EMI (₹)' },
        { key: 'outstanding_balance', label: 'Balance (₹)' },
        { key: 'next_due_date', label: 'Next Due' },
      ]);
    } else {
      // Utilization summary
      exportToCsv(buses, 'FleetMind_Fleet_Utilization_Report', [
        { key: 'bus_number', label: 'Bus ID' },
        { key: 'status', label: 'Status' },
        { key: 'odometer', label: 'Odometer (km)' },
        { key: 'route', label: 'Route' },
        { key: 'assigned_driver', label: 'Driver' },
      ]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#00C2FF]" />
            Reports & Analytics Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Export comprehensive compliance reports, fuel logs, driver evaluations, and financial audit statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-[#0F2742] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#00C2FF]/50"
          >
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Current Month (Oct 2026)</option>
            <option value="quarter">Q3 Financial Quarter</option>
            <option value="year">Full Year 2026</option>
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={handleExportCurrentReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Download className="w-4 h-4" />
            Export Selected CSV
          </button>
        </div>
      </div>

      {/* Report Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {[
          { id: 'utilization', label: 'Fleet Utilization', icon: Bus },
          { id: 'vehicles', label: 'Vehicle Performance', icon: Bus },
          { id: 'drivers', label: 'Driver Safety & Scores', icon: Users },
          { id: 'maintenance', label: 'Maintenance & Costs', icon: Wrench },
          { id: 'fuel', label: 'Fuel Consumption', icon: Fuel },
          { id: 'financial', label: 'Profit & Loss Statement', icon: Wallet },
          { id: 'emi', label: 'Loan & EMI Schedule', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#00C2FF] text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#0F2742]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Selected Report Content Display */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white font-heading capitalize">
              {activeTab} Detailed Report
            </h3>
            <p className="text-xs text-slate-400">Generated on October 12, 2026 • Verified Audit Layer</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Audit Ready
          </span>
        </div>

        {/* Tab 1: Utilization */}
        {activeTab === 'utilization' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-xs text-slate-400 block">Fleet Utilization</span>
                <span className="text-2xl font-bold text-[#00C2FF] mt-1 block">
                  {Math.round((buses.filter(b => b.status === 'active').length / buses.length) * 100)}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-xs text-slate-400 block">Active In Service</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {buses.filter(b => b.status === 'active').length} / {buses.length} Coaches
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-xs text-slate-400 block">Completed Trips This Month</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {trips.length} Dispatches
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Bus ID</th>
                    <th className="px-4 py-3">Registration #</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Odometer</th>
                    <th className="px-4 py-3">Assigned Route</th>
                    <th className="px-4 py-3">Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {buses.map(b => (
                    <tr key={b.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-white">{b.bus_number}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{b.registration_number}</td>
                      <td className="px-4 py-3 capitalize text-emerald-400">{b.status}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDistance(b.odometer)}</td>
                      <td className="px-4 py-3 text-slate-300">{b.route || 'Standby'}</td>
                      <td className="px-4 py-3 text-white">{b.assigned_driver || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Vehicle Performance */}
        {activeTab === 'vehicles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Bus Number</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Fuel Type</th>
                  <th className="px-4 py-3">Odometer Reading</th>
                  <th className="px-4 py-3">Next Service Date</th>
                  <th className="px-4 py-3">Insurance Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {buses.map(b => (
                  <tr key={b.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-bold text-white">{b.bus_number}</td>
                    <td className="px-4 py-3 text-slate-200">{b.model}</td>
                    <td className="px-4 py-3 text-slate-300">{b.capacity} Seats</td>
                    <td className="px-4 py-3 text-slate-300">{b.fuel_type}</td>
                    <td className="px-4 py-3 font-mono text-white">{formatDistance(b.odometer)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(b.next_service_date)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(b.insurance_expiry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Drivers */}
        {activeTab === 'drivers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Driver Name</th>
                  <th className="px-4 py-3">Licence Number</th>
                  <th className="px-4 py-3">Safety Score</th>
                  <th className="px-4 py-3">Total Trips</th>
                  <th className="px-4 py-3">Distance Logged</th>
                  <th className="px-4 py-3">Licence Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-bold text-white">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{d.license_number}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{d.safety_score}%</td>
                    <td className="px-4 py-3 text-slate-200">{d.total_trips}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDistance(d.distance_km)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(d.license_expiry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Maintenance */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Workshop Spend:</span>
              <span className="font-bold text-emerald-400 text-base font-mono">{formatCurrency(totalMaintAmount)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Service Type</th>
                    <th className="px-4 py-3">Service Date</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Mechanic</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {serviceRecords.map(s => (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-white">{s.bus_number}</td>
                      <td className="px-4 py-3 capitalize text-slate-200">{s.service_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(s.service_date)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{formatCurrency(s.cost)}</td>
                      <td className="px-4 py-3 text-slate-200">{s.mechanic_name}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Fuel */}
        {activeTab === 'fuel' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Fuel Expenses:</span>
              <span className="font-bold text-orange-400 text-base font-mono">{formatCurrency(totalFuelAmount)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Quantity (L)</th>
                    <th className="px-4 py-3">Rate (₹/L)</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Fuel Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fuelRecords.map(f => (
                    <tr key={f.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-white">{f.bus_number}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(f.date)}</td>
                      <td className="px-4 py-3 text-slate-200">{f.liters} L</td>
                      <td className="px-4 py-3 text-slate-300">₹{f.price_per_liter}</td>
                      <td className="px-4 py-3 font-mono text-[#00C2FF] font-bold">{formatCurrency(f.amount)}</td>
                      <td className="px-4 py-3 text-slate-300">{f.fuel_station}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Financial P&L */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-xs text-slate-400 block">Gross Revenue</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-xs text-slate-400 block">Operating Costs</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block font-mono">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#08111F] border border-white/5">
                <span className="text-xs text-slate-400 block">Net Profit</span>
                <span className="text-xl font-bold text-[#00C2FF] mt-1 block font-mono">{formatCurrency(totalRevenue - totalExpenses)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-white">{e.reference_number || 'TXN'}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">{e.category.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-200">{e.description}</td>
                      <td className="px-4 py-3 uppercase font-bold text-[10px]">
                        <span className={e.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'}>
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        <span className={e.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'}>
                          {e.type === 'revenue' ? '+' : '-'}{formatCurrency(e.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: EMI */}
        {activeTab === 'emi' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Loan ID</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Lender</th>
                  <th className="px-4 py-3">Principal Amount</th>
                  <th className="px-4 py-3">Monthly EMI</th>
                  <th className="px-4 py-3">Outstanding Balance</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Next Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loans.map(l => (
                  <tr key={l.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono font-bold text-white">{l.loan_id}</td>
                    <td className="px-4 py-3 text-slate-200">{l.bus_number}</td>
                    <td className="px-4 py-3 text-slate-300">{l.lender}</td>
                    <td className="px-4 py-3 font-mono text-white">{formatCurrency(l.principal_amount)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#00C2FF]">{formatCurrency(l.monthly_emi)}</td>
                    <td className="px-4 py-3 font-mono text-amber-400">{formatCurrency(l.outstanding_balance)}</td>
                    <td className="px-4 py-3 text-slate-300">{l.installments_paid}/{l.installments_total} EMIs</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(l.next_due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
