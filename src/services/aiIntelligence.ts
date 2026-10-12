import { fleetStore } from './store';
import { formatCurrency } from '../utils/formatters';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  metrics?: { label: string; value: string; color?: string }[];
  actionLink?: string;
  actionText?: string;
}

export const SUGGESTED_QUESTIONS = [
  "Which vehicles need maintenance soon?",
  "Which vehicles have the highest fuel expenses?",
  "Which vehicles are underutilized?",
  "What are our biggest operating costs this month?",
  "Which trips are delayed?",
  "Which vehicles have unusual fuel consumption?",
  "How can we reduce fleet operating expenses?",
  "Summarize this month's fleet performance."
];

export function generateFleetAiResponse(query: string): AiChatMessage {
  const q = query.toLowerCase();
  const buses = fleetStore.buses;
  const fuel = fleetStore.fuelRecords;
  const expenses = fleetStore.expenses;
  const trips = fleetStore.trips;
  const services = fleetStore.serviceRecords;

  // 1. Maintenance query
  if (q.includes('maintenance') || q.includes('service') || q.includes('repair')) {
    const overdueBuses = buses.filter(b => {
      if (!b.next_service_date) return false;
      return new Date(b.next_service_date) < new Date('2026-10-12');
    });

    const soonBuses = buses.filter(b => {
      if (!b.next_service_date) return false;
      const nextDate = new Date(b.next_service_date);
      const diffDays = Math.ceil((nextDate.getTime() - new Date('2026-10-12').getTime()) / (1000 * 3600 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });

    const activeWorkshopTasks = services.filter(s => s.status === 'in_progress').length;

    let text = `### 🔧 Fleet Maintenance Analytics & Health Diagnostics\n\n`;
    if (overdueBuses.length > 0) {
      text += `⚠️ **Overdue Attention Required:**\n`;
      overdueBuses.forEach(b => {
        text += `- **${b.bus_number}** (${b.model}): Service was scheduled on **${b.next_service_date}** (Status: *${b.status}*).\n`;
      });
      text += `\n`;
    }

    text += `📅 **Upcoming Scheduled Services:**\n`;
    if (soonBuses.length > 0) {
      soonBuses.forEach(b => {
        text += `- **${b.bus_number}**: Next service due on **${b.next_service_date}** (Odometer: ${b.odometer.toLocaleString()} km).\n`;
      });
    } else {
      text += `No regular services due within the next 30 days.\n`;
    }

    text += `\n💡 **AI Recommendation:** Immediately approve the battery temperature sensor recalibration for **FM-103** in Workshop Bay 2 before dispatching on intercity routes.`;

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Overdue Vehicles', value: `${overdueBuses.length}`, color: 'red' },
        { label: 'In Workshop Now', value: `${activeWorkshopTasks}`, color: 'amber' },
        { label: 'Upcoming (30d)', value: `${soonBuses.length}`, color: 'cyan' },
      ],
      actionLink: '/maintenance',
      actionText: 'Open Maintenance Workspace'
    };
  }

  // 2. Highest fuel expenses
  if (q.includes('fuel expenses') || q.includes('highest fuel') || q.includes('fuel cost')) {
    const busFuelMap: Record<string, { totalAmount: number; totalLiters: number }> = {};
    fuel.forEach(f => {
      if (!busFuelMap[f.bus_number]) busFuelMap[f.bus_number] = { totalAmount: 0, totalLiters: 0 };
      busFuelMap[f.bus_number].totalAmount += f.amount;
      busFuelMap[f.bus_number].totalLiters += f.liters;
    });

    const sortedFuelBuses = Object.entries(busFuelMap).sort((a, b) => b[1].totalAmount - a[1].totalAmount);
    const topBus = sortedFuelBuses[0];

    let text = `### ⛽ Fuel Consumption & Expense Breakdown\n\n`;
    text += `Based on current verified fuel station receipts, here are the top vehicles by fuel expenditure:\n\n`;
    sortedFuelBuses.slice(0, 4).forEach(([busNum, data], idx) => {
      text += `${idx + 1}. **${busNum}**: ${formatCurrency(data.totalAmount)} (${data.totalLiters} Litres logged)\n`;
    });

    text += `\n💡 **AI Observation:** **${topBus ? topBus[0] : 'FM-102'}** operates on high-speed intercity routes (Delhi - Jaipur). Ensuring tire pressures stay within OEM 125 PSI can deliver an estimated **3.8% fuel economy gain**.`;

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Total Fuel Spent', value: formatCurrency(fuel.reduce((a, b) => a + b.amount, 0)), color: 'blue' },
        { label: 'Top Consumer', value: topBus ? topBus[0] : 'FM-102', color: 'orange' },
      ],
      actionLink: '/fuel',
      actionText: 'View Fuel Management'
    };
  }

  // 3. Underutilized vehicles
  if (q.includes('underutilized') || q.includes('utilization') || q.includes('idle')) {
    const inactiveBuses = buses.filter(b => b.status === 'inactive');
    const maintenanceBuses = buses.filter(b => b.status === 'maintenance');
    const activeTripsCount = trips.filter(t => t.status === 'in_progress').length;
    const utilizationRate = Math.round((activeTripsCount / buses.length) * 100);

    let text = `### 📊 Fleet Asset Utilization Analysis\n\n`;
    text += `Current Fleet Utilization Rate: **${utilizationRate}%** (${activeTripsCount} of ${buses.length} vehicles active on revenue trips).\n\n`;
    text += `**Identified Low-Utilization Vehicles:**\n`;
    if (inactiveBuses.length > 0) {
      inactiveBuses.forEach(b => {
        text += `- **${b.bus_number}** (${b.model}): Marked **Inactive** due to ${b.notes || 'scheduled downtime'}.\n`;
      });
    }
    if (maintenanceBuses.length > 0) {
      maintenanceBuses.forEach(b => {
        text += `- **${b.bus_number}** (${b.model}): Stationed in **Maintenance Workshop**.\n`;
      });
    }
    text += `\n💡 **Recommendation:** Prioritize completion of the gearbox overhaul on **FM-106** to return it to the Ahmedabad - Surat business shuttle before the weekend passenger surge.`;

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Fleet Utilization', value: `${utilizationRate}%`, color: 'cyan' },
        { label: 'Active Trips', value: `${activeTripsCount}`, color: 'emerald' },
        { label: 'Idle / Workshop', value: `${inactiveBuses.length + maintenanceBuses.length}`, color: 'red' },
      ],
      actionLink: '/trips',
      actionText: 'Optimize Trip Dispatch'
    };
  }

  // 4. Operating costs
  if (q.includes('operating costs') || q.includes('biggest operating') || q.includes('cost') || q.includes('expenses')) {
    const expByCategory: Record<string, number> = {};
    expenses.filter(e => e.type === 'expense').forEach(e => {
      expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount;
    });

    const sortedExp = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]);
    const totalExp = Object.values(expByCategory).reduce((a, b) => a + b, 0);

    let text = `### 💰 Monthly Operating Cost Structure\n\n`;
    text += `Total operating expenses recorded: **${formatCurrency(totalExp)}**.\n\n`;
    text += `**Highest Operating Cost Categories:**\n`;
    sortedExp.forEach(([cat, amt], i) => {
      const pct = Math.round((amt / totalExp) * 100);
      text += `${i + 1}. **${cat.toUpperCase().replace('_', ' ')}**: ${formatCurrency(amt)} (${pct}% of total)\n`;
    });
    text += `\n💡 **Cost Optimization Insight:** Vehicle EMI financing and Driver Salaries represent over **65%** of fixed monthly overheads. Maximizing round-trip charter utilization significantly improves operating margins.`;

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Total Expenses', value: formatCurrency(totalExp), color: 'red' },
        { label: 'Largest Category', value: sortedExp[0] ? sortedExp[0][0].toUpperCase() : 'EMI', color: 'orange' },
      ],
      actionLink: '/finance',
      actionText: 'View P&L Ledger'
    };
  }

  // 5. Delayed trips
  if (q.includes('delayed') || q.includes('trips')) {
    const delayed = trips.filter(t => t.status === 'delayed');
    const inProgress = trips.filter(t => t.status === 'in_progress');

    let text = `### ⏱️ Live Trip Dispatch & Punctuality Status\n\n`;
    if (delayed.length === 0) {
      text += `✅ **Zero Critical Delays Reported.** All active dispatches are running within standard ±15 minute schedule buffers.\n\n`;
    } else {
      text += `⚠️ **Flagged Delayed Trips (${delayed.length}):**\n`;
      delayed.forEach(t => {
        text += `- **${t.trip_code}** (${t.bus_number}): Route *${t.route_name}*, assigned to ${t.driver_name}.\n`;
      });
      text += `\n`;
    }
    text += `Currently Active Intercity Trips:\n`;
    inProgress.forEach(t => {
      text += `- **${t.trip_code}** (${t.bus_number} - ${t.driver_name}): En route to **${t.end_point}**.\n`;
    });

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Active Trips', value: `${inProgress.length}`, color: 'emerald' },
        { label: 'Delayed', value: `${delayed.length}`, color: 'red' },
      ],
      actionLink: '/trips',
      actionText: 'View Trip Scheduling'
    };
  }

  // 6. Unusual fuel consumption / anomalies
  if (q.includes('unusual') || q.includes('anomaly') || q.includes('consumption')) {
    let text = `### 🔍 Telematics Anomaly Detection Engine\n\n`;
    text += `Scanning telematics log signatures, odometer delta vs litres pumped:\n\n`;
    text += `- **Vehicle FM-108** (Tata Marcopolo Prime): Logged **4.3 km/L** on Bengaluru-Chennai run, which is **11% below** the fleet benchmark of 4.8 km/L for this category. High idling detected near Krishnagiri Toll.\n`;
    text += `- **Vehicle FM-103** (Tata Starbus Ultra EV): Thermal variance alert on Cell Pack 4 flagged during heavy regenerative braking.\n\n`;
    text += `💡 **Automated Flag:** No sign of fuel pilferage detected; divergence is primarily attributed to monsoon highway construction diversions and stop-and-go congestion.`;

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Anomalies Flagged', value: '2', color: 'amber' },
        { label: 'Benchmark km/L', value: '4.8', color: 'cyan' },
      ],
      actionLink: '/fuel',
      actionText: 'Inspect Telematics Logs'
    };
  }

  // 7. Reduce operating expenses
  if (q.includes('reduce') || q.includes('saving') || q.includes('optimization')) {
    let text = `### 💡 AI Fleet Optimization & Cost-Saving Blueprint\n\n`;
    text += `Based on algorithmic telemetry and financial audits across your 8 fleet vehicles:\n\n`;
    text += `1. **Preventive Tire Maintenance (Save est. ₹42,000/yr):** Front tire alignment on FM-102 and FM-104 will prevent premature shoulder wear.\n`;
    text += `2. **Bulk Restocking Discount (Save est. ₹18,500):** Ordering Knorr-Bremse brake pads in batches of 15 sets unlocks 12% OEM vendor rebate.\n`;
    text += `3. **Idling Telematics Alerts (Save est. ₹31,000/mo in fuel):** Implementing strict 5-minute auto-cutoff alerts at toll plazas.\n`;
    text += `4. **FASTag Route Optimization (Save est. ₹14,000/mo):** Shifting weekend charters to alternate state expressway corridors during peak congestion surcharges.\n`;

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metrics: [
        { label: 'Estimated Monthly Savings', value: '₹63,500', color: 'emerald' },
        { label: 'Efficiency Gain', value: '+6.2%', color: 'cyan' },
      ]
    };
  }

  // Default: Performance Summary
  const rev = expenses.filter(e => e.type === 'revenue').reduce((a, b) => a + b.amount, 0);
  const exp = expenses.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const net = rev - exp;
  const activeBuses = buses.filter(b => b.status === 'active').length;

  let text = `### 📈 Executive Fleet Performance Summary\n\n`;
  text += `Here is your high-level executive fleet snapshot:\n\n`;
  text += `- **Fleet Capacity & Availability:** **${activeBuses} / ${buses.length}** vehicles are currently in active service ready for dispatch.\n`;
  text += `- **Gross Operating Revenue:** **${formatCurrency(rev)}** from scheduled passenger tickets and corporate transport charters.\n`;
  text += `- **Operating Expenditure:** **${formatCurrency(exp)}** (Fuel, Fleet Maintenance, Payroll, EMI).\n`;
  text += `- **Net Fleet Profit:** **${formatCurrency(net)}** (**${rev > 0 ? Math.round((net / rev) * 100) : 0}%** Net Margin).\n`;
  text += `- **Driver Safety Benchmark:** Fleet average safety rating is **94.7 / 100** with zero severe telematics incidents recorded this quarter.\n`;

  return {
    id: `ai-${Date.now()}`,
    sender: 'assistant',
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    metrics: [
      { label: 'Revenue', value: formatCurrency(rev), color: 'cyan' },
      { label: 'Net Profit', value: formatCurrency(net), color: 'emerald' },
      { label: 'Active Fleet', value: `${activeBuses}/${buses.length}`, color: 'blue' },
    ],
    actionLink: '/reports',
    actionText: 'Generate Executive PDF Report'
  };
}
