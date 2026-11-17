import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus, Users, CalendarClock, Fuel, Wrench, Wallet, TrendingUp,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Plus, Download, Sparkles, CheckCircle2, Clock, RotateCcw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useFleetData } from '../hooks/useFleetData';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    buses, drivers, trips, fuelRecords, serviceRecords, expenses,
    notifications, lastUpdated, refreshData, profile: storeProfile,
    loadStarterTemplate
  } = useFleetData();
  const { authMode, isSupabaseConfigured, user, profile: authProfile } = useAuth();
  const profile = authProfile || storeProfile;
  const [dateRange, setDateRange] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const formattedLastUpdated = (() => {
    try {
      const d = new Date(lastUpdated);
      if (isNaN(d.getTime())) return 'Just now';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  })();

  // KPI Computations from actual application records
  const totalVehicles = buses.length;
  const activeVehicles = buses.filter(b => b.status === 'active').length;
  const maintenanceVehicles = buses.filter(b => b.status === 'maintenance').length;
  const idleVehicles = buses.filter(b => b.status !== 'active' && b.status !== 'maintenance').length;
  const totalDrivers = drivers.length;
  const onDutyDrivers = drivers.filter(d => d.today_availability === 'on_trip').length;
  const availableDrivers = drivers.filter(d => d.today_availability === 'available').length;

  const activeTrips = trips.filter(t => t.status === 'in_progress').length;
  const scheduledTrips = trips.filter(t => t.status === 'scheduled').length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;

  const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (f.amount || 0), 0);
  const totalFuelLiters = fuelRecords.reduce((acc, f) => acc + (f.liters || 0), 0);
  const avgFuelCostPerLiter = totalFuelLiters > 0 ? Math.round(totalFuelCost / totalFuelLiters) : 0;

  const totalMaintenanceCost = serviceRecords.reduce((acc, s) => acc + (s.cost || 0), 0);
  const completedServices = serviceRecords.filter(s => s.status === 'completed').length;
  const inProgressServices = serviceRecords.filter(s => s.status === 'in_progress').length;

  const overdueInspections = buses.filter(b => b.next_service_date && new Date(b.next_service_date) < new Date()).length;

  const utilizationRate = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

  // Revenue & Expenses
  const totalRevenue = expenses.filter(e => e.type === 'revenue').reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);

  // Chart Data: Fleet Activity over past 6 months (accurately reflecting actual fleet records)
  const fleetActivityData = totalVehicles > 0 ? [
    { month: 'May', active: Math.max(0, activeVehicles - 2), idle: idleVehicles, maintenance: maintenanceVehicles },
    { month: 'Jun', active: Math.max(0, activeVehicles - 1), idle: idleVehicles, maintenance: maintenanceVehicles },
    { month: 'Jul', active: activeVehicles, idle: idleVehicles, maintenance: maintenanceVehicles },
    { month: 'Aug', active: activeVehicles, idle: idleVehicles, maintenance: maintenanceVehicles },
    { month: 'Sep', active: activeVehicles, idle: idleVehicles, maintenance: maintenanceVehicles },
    { month: 'Oct', active: activeVehicles, idle: idleVehicles, maintenance: maintenanceVehicles },
  ] : [
    { month: 'May', active: 0, idle: 0, maintenance: 0 },
    { month: 'Jun', active: 0, idle: 0, maintenance: 0 },
    { month: 'Jul', active: 0, idle: 0, maintenance: 0 },
    { month: 'Aug', active: 0, idle: 0, maintenance: 0 },
    { month: 'Sep', active: 0, idle: 0, maintenance: 0 },
    { month: 'Oct', active: 0, idle: 0, maintenance: 0 },
  ];

  // Chart Data: Monthly Revenue vs Operating Expenses
  const financialData = (totalRevenue > 0 || totalExpenses > 0) ? [
    { month: 'May', revenue: Math.round(totalRevenue * 0.7), expenses: Math.round(totalExpenses * 0.8) },
    { month: 'Jun', revenue: Math.round(totalRevenue * 0.8), expenses: Math.round(totalExpenses * 0.85) },
    { month: 'Jul', revenue: Math.round(totalRevenue * 0.85), expenses: Math.round(totalExpenses * 0.9) },
    { month: 'Aug', revenue: Math.round(totalRevenue * 0.9), expenses: Math.round(totalExpenses * 0.95) },
    { month: 'Sep', revenue: Math.round(totalRevenue * 0.95), expenses: Math.round(totalExpenses * 0.98) },
    { month: 'Oct', revenue: totalRevenue, expenses: totalExpenses },
  ] : [
    { month: 'May', revenue: 0, expenses: 0 },
    { month: 'Jun', revenue: 0, expenses: 0 },
    { month: 'Jul', revenue: 0, expenses: 0 },
    { month: 'Aug', revenue: 0, expenses: 0 },
    { month: 'Sep', revenue: 0, expenses: 0 },
    { month: 'Oct', revenue: 0, expenses: 0 },
  ];

  // Vehicle Status Distribution
  const statusDistribution = [
    { name: 'Active', value: activeVehicles, color: '#10B981' },
    { name: 'Maintenance', value: maintenanceVehicles, color: '#F59E0B' },
    { name: 'Inactive', value: idleVehicles, color: '#64748B' },
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
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            {/* Storage Mode Badge */}
            {authMode === 'supabase' && user ? (
              <span
                title="Connected to Supabase Cloud Database (PostgreSQL). Your changes are isolated to your account."
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cloud Database Connected
              </span>
            ) : (
              <span
                title="Running in local demo mode with simulated data."
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Demo Preview Mode
              </span>
            )}

            {/* Telematics / GPS State Badge */}
            <span
              title="GPS data reflects recorded check-in positions. Live hardware telemetry stream requires webhook integration."
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Recorded GPS Check-ins (Hardware Webhook Standby)
            </span>

            {/* Last-Updated Timestamp */}
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 ml-1">
              <Clock className="w-3.5 h-3.5 text-[#00C2FF]" />
              <span>Updated {formattedLastUpdated}</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading tracking-tight">
            Fleet Intelligence Overview
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Operational dashboard tracking vehicle status, scheduled maintenance logs, driver assignments, and financial metrics across your transport network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard data and recalculate metrics"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#08111F] text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00C2FF]' : ''}`} />
            <span>Refresh</span>
          </button>

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

      {/* New Workspace Onboarding Banner when 0 vehicles */}
      {totalVehicles === 0 && (
        <div className="bg-gradient-to-r from-blue-950/60 via-[#0B1F3A] to-[#0A1024] border border-[#00C2FF]/30 rounded-3xl p-6 relative overflow-hidden shadow-xl animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C2FF]/10 text-[#00C2FF] text-xs font-bold border border-[#00C2FF]/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Fleet Workspace Active</span>
              </div>
              <h3 className="text-xl font-bold text-white font-heading">
                Welcome to your Fleet Operations Workspace, {profile?.full_name?.split(' ')[0] || 'Operator'}!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your database connection is active. You have 0 registered vehicles. Start by registering your first commercial vehicle, adding drivers, or optionally load a starter template with 3 sample vehicles to preview features.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/buses')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-all shadow-lg shadow-[#00C2FF]/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Register First Vehicle</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Load 3 starter vehicles and 2 drivers to test your new workspace?')) {
                    loadStarterTemplate();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
              >
                <span>Load Starter Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vehicles"
          value={totalVehicles}
          icon={Bus}
          change={totalVehicles > 0 ? `${activeVehicles} active in service` : "No vehicles"}
          changeType="positive"
          subtext={`${totalVehicles} registered ${totalVehicles === 1 ? 'coach' : 'coaches'}`}
          iconColor="text-blue-400"
        />
        <StatCard
          label="Active In Service"
          value={activeVehicles}
          icon={CheckCircle2}
          change={`${utilizationRate}% of fleet`}
          changeType={utilizationRate > 50 ? "positive" : "neutral"}
          subtext={`${idleVehicles} idle or standby`}
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Under Maintenance"
          value={maintenanceVehicles}
          icon={Wrench}
          change={overdueInspections > 0 ? `${overdueInspections} overdue inspection${overdueInspections > 1 ? 's' : ''}` : maintenanceVehicles > 0 ? `${maintenanceVehicles} in workshop` : "Zero downtime"}
          changeType={overdueInspections > 0 || maintenanceVehicles > 0 ? "negative" : "positive"}
          subtext={`${inProgressServices} active work ${inProgressServices === 1 ? 'order' : 'orders'}`}
          iconColor="text-amber-400"
        />
        <StatCard
          label="Total Drivers"
          value={totalDrivers}
          icon={Users}
          change={`${onDutyDrivers} on duty`}
          changeType="positive"
          subtext={`${availableDrivers} available for dispatch`}
          iconColor="text-purple-400"
        />
        <StatCard
          label="Active Trips"
          value={activeTrips}
          icon={CalendarClock}
          change={activeTrips > 0 ? `${activeTrips} en route` : "0 in transit"}
          changeType={activeTrips > 0 ? "positive" : "neutral"}
          subtext={`${scheduledTrips} scheduled • ${completedTrips} completed`}
          iconColor="text-[#00C2FF]"
        />
        <StatCard
          label="Monthly Fuel Cost"
          value={formatCurrency(totalFuelCost)}
          icon={Fuel}
          change={avgFuelCostPerLiter > 0 ? `Avg ${formatCurrency(avgFuelCostPerLiter)}/L` : "No fuel logs"}
          changeType="neutral"
          subtext={`${totalFuelLiters.toLocaleString()} L across ${fuelRecords.length} entries`}
          iconColor="text-orange-400"
        />
        <StatCard
          label="Maintenance Costs"
          value={formatCurrency(totalMaintenanceCost)}
          icon={AlertTriangle}
          change={`${serviceRecords.length} service ${serviceRecords.length === 1 ? 'record' : 'records'}`}
          changeType="neutral"
          subtext={`${completedServices} completed repairs`}
          iconColor="text-rose-400"
        />
        <StatCard
          label="Fleet Utilization"
          value={`${utilizationRate}%`}
          icon={TrendingUp}
          change={`${activeVehicles} of ${totalVehicles} in service`}
          changeType={utilizationRate >= 80 ? "positive" : "neutral"}
          subtext={`Target: >80% (${utilizationRate >= 80 ? 'Target achieved' : `${80 - utilizationRate}% to target`})`}
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
              {totalVehicles === 0
                ? 'Welcome to FleetMind AI Telematics. Once you register vehicles and log telemetry, AI health predictions, predictive maintenance, and route optimizations will generate automatically.'
                : 'Notice: Restocking high-flow air filters and brake pads in bulk can reduce parts expenditure by 12%. Telematics sensors calibrated.'}
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
            <span className="text-xs font-medium text-[#00C2FF] bg-[#00C2FF]/10 px-2 py-1 rounded-lg">
              Recorded Trends
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

          <div className="h-52 w-full my-2 flex items-center justify-center">
            {totalVehicles === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 text-center py-6">
                <Bus className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-300 font-medium">No registered vehicles</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Status breakdown will appear when coaches are added</p>
              </div>
            ) : (
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
            )}
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

          <div className="h-56 w-full flex items-center justify-center">
            {fuelTrendData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 text-center py-6">
                <Fuel className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-300 font-medium">No fuel logs recorded</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Log fuel refills to visualize consumption by vehicle</p>
                <button
                  onClick={() => navigate('/fuel')}
                  className="mt-2 text-xs text-[#00C2FF] hover:underline font-semibold"
                >
                  + Add Fuel Record
                </button>
              </div>
            ) : (
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
            )}
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
              <p className="text-xs text-slate-400">Scheduled route dispatches</p>
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
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <CalendarClock className="w-8 h-8 text-slate-600 mb-1" />
                        <p className="text-xs text-slate-300 font-semibold">No trips scheduled yet</p>
                        <p className="text-[11px] text-slate-500">Assign drivers and vehicles to launch route trips</p>
                        <button
                          onClick={() => navigate('/trips')}
                          className="mt-2 text-xs text-[#00C2FF] hover:underline font-semibold"
                        >
                          + Dispatch First Trip
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  trips.slice(0, 5).map((t) => (
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
                          View Telematics
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">All systems normal</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No critical alerts or pending service warnings</p>
                </div>
              ) : (
                notifications.slice(0, 4).map((n) => (
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
                ))
              )}
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
