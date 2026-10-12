import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus, Users, CalendarClock, Fuel, Wrench, Wallet, TrendingUp,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Plus, Download, Sparkles, CheckCircle2, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useFleetData } from '../hooks/useFleetData';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { buses, drivers, trips, fuelRecords, serviceRecords, expenses, notifications } = useFleetData();
  const [dateRange, setDateRange] = useState('month');

  // KPI Computations
  const totalVehicles = buses.length;
  const activeVehicles = buses.filter(b => b.status === 'active').length;
  const maintenanceVehicles = buses.filter(b => b.status === 'maintenance').length;
  const totalDrivers = drivers.length;
  const activeTrips = trips.filter(t => t.status === 'in_progress').length;

  const totalFuelCost = fuelRecords.reduce((acc, f) => acc + f.amount, 0);
  const totalMaintenanceCost = serviceRecords.reduce((acc, s) => acc + s.cost, 0);
  const utilizationRate = Math.round((activeVehicles / (totalVehicles || 1)) * 100);

  // Revenue & Expenses
  const totalRevenue = expenses.filter(e => e.type === 'revenue').reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);

  // Chart Data: Fleet Activity over past 6 months
  const fleetActivityData = [
    { month: 'May', active: 6, idle: 1, maintenance: 1 },
    { month: 'Jun', active: 7, idle: 0, maintenance: 1 },
    { month: 'Jul', active: 6, idle: 1, maintenance: 1 },
    { month: 'Aug', active: 7, idle: 0, maintenance: 1 },
    { month: 'Sep', active: 8, idle: 0, maintenance: 0 },
    { month: 'Oct', active: activeVehicles, idle: totalVehicles - activeVehicles - maintenanceVehicles, maintenance: maintenanceVehicles },
  ];

  // Chart Data: Monthly Revenue vs Operating Expenses
  const financialData = [
    { month: 'May', revenue: 780000, expenses: 490000 },
    { month: 'Jun', revenue: 840000, expenses: 510000 },
    { month: 'Jul', revenue: 810000, expenses: 530000 },
    { month: 'Aug', revenue: 920000, expenses: 560000 },
    { month: 'Sep', revenue: 990000, expenses: 590000 },
    { month: 'Oct', revenue: totalRevenue, expenses: totalExpenses },
  ];

  // Vehicle Status Distribution
  const statusDistribution = [
    { name: 'Active', value: activeVehicles, color: '#10B981' },
    { name: 'Maintenance', value: maintenanceVehicles, color: '#F59E0B' },
    { name: 'Inactive', value: totalVehicles - activeVehicles - maintenanceVehicles, color: '#64748B' },
  ];

  // Fuel trend data
  const fuelTrendData = fuelRecords.slice(0, 6).map(f => ({
    name: f.bus_number,
    liters: f.liters,
    cost: f.amount
  }));

  const handleExportSummary = () => {
    const summary = [
      { Metric: 'Total Vehicles', Value: totalVehicles },
      { Metric: 'Active Vehicles', Value: activeVehicles },
      { Metric: 'Vehicles Under Maintenance', Value: maintenanceVehicles },
      { Metric: 'Total Drivers', Value: totalDrivers },
      { Metric: 'Active Trips', Value: activeTrips },
      { Metric: 'Total Fuel Expenses', Value: formatCurrency(totalFuelCost) },
      { Metric: 'Total Maintenance Costs', Value: formatCurrency(totalMaintenanceCost) },
      { Metric: 'Fleet Utilization', Value: `${utilizationRate}%` },
      { Metric: 'Gross Revenue', Value: formatCurrency(totalRevenue) },
      { Metric: 'Total Operating Expenses', Value: formatCurrency(totalExpenses) },
      { Metric: 'Net Profit', Value: formatCurrency(totalRevenue - totalExpenses) },
    ];
    exportToCsv(summary, 'FleetMind_Executive_Dashboard_Summary');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0F2742] via-[#0B1F3A] to-[#0A1024] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-[#00C2FF]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/20">
              Fleet Operations Live
            </span>
            <span className="text-xs text-slate-400">All systems operational</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading tracking-tight">
            Fleet Intelligence Overview
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Real-time telemetry, driver safety monitoring, service alerts, and financial metrics across your commercial transport network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-[#08111F] border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-[#00C2FF]/50"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">Full Year</option>
          </select>

          <button
            onClick={handleExportSummary}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#08111F] text-slate-200 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Summary
          </button>

          <button
            onClick={() => navigate('/buses')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vehicles"
          value={totalVehicles}
          icon={Bus}
          change="+1 this month"
          changeType="positive"
          subtext="8 commercial coaches"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Active In Service"
          value={activeVehicles}
          icon={CheckCircle2}
          change={`${Math.round((activeVehicles / totalVehicles) * 100)}% active`}
          changeType="positive"
          subtext="Ready for dispatch"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Under Maintenance"
          value={maintenanceVehicles}
          icon={Wrench}
          change={maintenanceVehicles > 0 ? "Requires attention" : "Zero downtime"}
          changeType={maintenanceVehicles > 0 ? "negative" : "positive"}
          subtext="In workshop bays"
          iconColor="text-amber-400"
        />
        <StatCard
          label="Total Drivers"
          value={totalDrivers}
          icon={Users}
          change="100% verified"
          changeType="positive"
          subtext="Commercial licences"
          iconColor="text-purple-400"
        />
        <StatCard
          label="Active Trips"
          value={activeTrips}
          icon={CalendarClock}
          change="On schedule"
          changeType="positive"
          subtext="Intercity routes"
          iconColor="text-[#00C2FF]"
        />
        <StatCard
          label="Monthly Fuel Cost"
          value={formatCurrency(totalFuelCost)}
          icon={Fuel}
          change="Avg ₹90/L"
          changeType="neutral"
          subtext={`${fuelRecords.reduce((a, b) => a + b.liters, 0)} Litres logged`}
          iconColor="text-orange-400"
        />
        <StatCard
          label="Maintenance Costs"
          value={formatCurrency(totalMaintenanceCost)}
          icon={AlertTriangle}
          change="8 service logs"
          changeType="neutral"
          subtext="OEM spares & repairs"
          iconColor="text-rose-400"
        />
        <StatCard
          label="Fleet Utilization"
          value={`${utilizationRate}%`}
          icon={TrendingUp}
          change="+4.2% vs last mo"
          changeType="positive"
          subtext="Target: >80%"
          iconColor="text-cyan-400"
        />
      </div>

      {/* AI Quick Insight Banner */}
      <div className="bg-[#0F2742]/80 border border-[#00C2FF]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-[#00C2FF]/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-heading">FleetMind AI Telematics Advisor</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00C2FF]/20 text-[#00C2FF] font-semibold">Active</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Notice: Bus FM-103 battery thermal sensor recalibration is scheduled. Restocking Knorr-Bremse brake pads in bulk can reduce parts expenditure by 12%.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/ai-intelligence')}
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors"
        >
          Explore AI Assistant →
        </button>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Activity Trends */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-heading">Fleet Activity Trends</h3>
              <p className="text-xs text-slate-400">Active vs Idle vs Maintenance Vehicles</p>
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
              Live
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fleetActivityData}>
                <defs>
                  <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00C2FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="maintGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1F3A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="active" stroke="#00C2FF" strokeWidth={2} fill="url(#activeGrad)" name="Active" />
                <Area type="monotone" dataKey="maintenance" stroke="#F59E0B" strokeWidth={2} fill="url(#maintGrad)" name="Maintenance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Revenue vs Operating Costs */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-heading">Financial Overview (P&L)</h3>
              <p className="text-xs text-slate-400">Monthly Revenue vs Operating Expenses</p>
            </div>
            <span className="text-xs font-medium text-[#00C2FF] bg-[#00C2FF]/10 px-2 py-1 rounded-lg">
              INR (₹)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#0B1F3A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#00C2FF" radius={[6, 6, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row Charts: Vehicle Status Distribution & Fuel Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Vehicle Status */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading">Fleet Status Distribution</h3>
            <p className="text-xs text-slate-400">Total {totalVehicles} registered vehicles</p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0B1F3A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs">
            {statusDistribution.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fuel Consumption by Vehicle */}
        <div className="lg:col-span-2 bg-[#0F2742] rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-heading">Fuel Consumption By Vehicle</h3>
              <p className="text-xs text-slate-400">Recent pump logs in Litres</p>
            </div>
            <button
              onClick={() => navigate('/fuel')}
              className="text-xs text-[#00C2FF] hover:underline font-medium"
            >
              All Fuel Logs →
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelTrendData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  formatter={(val: any, name: any) => name === 'cost' ? formatCurrency(Number(val)) : `${val} Litres`}
                  contentStyle={{ backgroundColor: '#0B1F3A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="liters" fill="#F97316" radius={[6, 6, 0, 0]} name="Liters" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Trips Table & Maintenance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips (2 cols) */}
        <div className="lg:col-span-2 bg-[#0F2742] rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-heading">Active & Recent Trips</h3>
              <p className="text-xs text-slate-400">Real-time route dispatches</p>
            </div>
            <button
              onClick={() => navigate('/trips')}
              className="text-xs text-[#00C2FF] hover:underline font-medium"
            >
              Trip Dispatcher →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Trip Code</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">{t.trip_code}</td>
                    <td className="px-4 py-3.5 text-slate-200">{t.bus_number}</td>
                    <td className="px-4 py-3.5 text-slate-200">{t.driver_name}</td>
                    <td className="px-4 py-3.5 text-slate-300 max-w-[160px] truncate">{t.route_name}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => navigate('/gps-tracking')}
                        className="text-[#00C2FF] hover:underline font-medium"
                      >
                        Track GPS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance & Action Alerts (1 col) */}
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white font-heading">Maintenance & Alerts</h3>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs text-[#00C2FF] hover:underline font-medium"
              >
                All Alerts →
              </button>
            </div>

            <div className="space-y-3">
              {notifications.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  onClick={() => n.link && navigate(n.link)}
                  className="p-3 rounded-xl bg-[#08111F] border border-white/5 hover:border-[#00C2FF]/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white group-hover:text-[#00C2FF] transition-colors">
                      {n.title}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      n.severity === 'critical' ? 'bg-rose-500/10 text-rose-400' :
                      n.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-[#00C2FF]'
                    }`}>
                      {n.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <button
              onClick={() => navigate('/maintenance')}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center justify-center gap-2"
            >
              <Wrench className="w-3.5 h-3.5 text-[#00C2FF]" />
              Schedule Vehicle Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
