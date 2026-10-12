import React, { useState } from 'react';
import {
  Wallet, Search, Plus, Download, Trash2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, Calendar, DollarSign, PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useFleetData } from '../hooks/useFleetData';
import { Expense, ExpenseCategory, TransactionType } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const FinancePage: React.FC = () => {
  const { expenses, addExpense, deleteExpense, buses } = useFleetData();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);

  // Form State
  const initialFormState: Omit<Expense, 'id'> = {
    category: 'fuel',
    type: 'expense',
    amount: 15000,
    date: new Date().toISOString().split('T')[0],
    description: '',
    bus_number: buses[0]?.bus_number || '',
    payment_method: 'Bank Transfer',
    reference_number: `TXN-${Math.floor(1000 + Math.random() * 9000)}`
  };

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>(initialFormState);

  // Calculated Totals
  const totalRevenue = expenses.filter(e => e.type === 'revenue').reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Category breakdown for Pie Chart
  const expenseCategoriesList = [
    { key: 'fuel', label: 'Fuel', color: '#F97316' },
    { key: 'maintenance', label: 'Maintenance', color: '#EC4899' },
    { key: 'driver_salary', label: 'Salaries', color: '#8B5CF6' },
    { key: 'emi', label: 'Vehicle EMI', color: '#00C2FF' },
    { key: 'tolls', label: 'Tolls & Fastag', color: '#10B981' },
    { key: 'insurance', label: 'Insurance', color: '#3B82F6' },
    { key: 'other', label: 'Other', color: '#64748B' },
  ];

  const categoryBreakdown = expenseCategoriesList.map(cat => {
    const sum = expenses
      .filter(e => e.type === 'expense' && e.category === cat.key)
      .reduce((acc, e) => acc + e.amount, 0);
    return {
      name: cat.label,
      value: sum,
      color: cat.color
    };
  }).filter(c => c.value > 0);

  const filteredTransactions = expenses.filter(t => {
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      (t.reference_number && t.reference_number.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCat;
  });

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || formData.amount <= 0) {
      alert('Description and positive amount are required.');
      return;
    }
    addExpense(formData);
    setIsAddOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(expenses, 'FleetMind_Financial_Ledger', [
      { key: 'reference_number', label: 'Txn Reference' },
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'bus_number', label: 'Vehicle' },
      { key: 'amount', label: 'Amount (₹)' },
      { key: 'payment_method', label: 'Payment Mode' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-[#00C2FF]" />
            Financial Management & Profit / Loss
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Revenue tracking, operating cost disbursements, vehicle EMI charges, and calculated profit margins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Ledger
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Record Transaction
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Fleet Revenue"
          value={formatCurrency(totalRevenue)}
          icon={ArrowDownLeft}
          change="+14.2% vs last mo"
          changeType="positive"
          subtext="Passenger tickets & charters"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Operating Expenditure"
          value={formatCurrency(totalExpenses)}
          icon={ArrowUpRight}
          change="Fuel, EMI, parts & staff"
          changeType="neutral"
          subtext="Verified disbursements"
          iconColor="text-rose-400"
        />
        <StatCard
          label="Net Operating Profit"
          value={formatCurrency(netProfit)}
          icon={TrendingUp}
          change={netProfit >= 0 ? "Positive Cashflow" : "Deficit"}
          changeType={netProfit >= 0 ? "positive" : "negative"}
          subtext="After all operating costs"
          iconColor="text-[#00C2FF]"
        />
        <StatCard
          label="Net Profit Margin"
          value={`${profitMargin}%`}
          icon={Wallet}
          change="Target: >25%"
          changeType="positive"
          subtext="Operating profitability"
          iconColor="text-cyan-400"
        />
      </div>

      {/* Expense Categories Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0F2742] rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading">Expense Allocation</h3>
            <p className="text-xs text-slate-400">Total {formatCurrency(totalExpenses)}</p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#0B1F3A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {categoryBreakdown.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-slate-300 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Toolbar + Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1F3A]">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#08111F] p-1 rounded-xl border border-white/10">
              {(['all', 'revenue', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 text-xs font-semibold capitalize rounded-lg transition-colors ${
                    typeFilter === t
                      ? 'bg-[#00C2FF] text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
                <tr>
                  <th className="px-5 py-3.5">Txn / Date</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Payment Mode</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-white font-semibold">{txn.reference_number || 'TXN-00'}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(txn.date)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-200">
                      <p className="font-semibold text-white">{txn.description}</p>
                      {txn.bus_number && <p className="text-[10px] text-slate-400">{txn.bus_number}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                        {txn.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold font-mono text-sm ${
                        txn.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {txn.type === 'revenue' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{txn.payment_method}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setDeletingExpId(txn.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECORD TRANSACTION MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Financial Transaction"
        subtitle="Post income or expense ledger items with vehicle allocation."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Transaction Type</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const t = e.target.value as TransactionType;
                  setFormData({
                    ...formData,
                    type: t,
                    category: t === 'revenue' ? 'revenue' : 'fuel'
                  });
                }}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="revenue">Income / Revenue (+)</option>
                <option value="expense">Expense Disbursement (-)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                {formData.type === 'revenue' ? (
                  <>
                    <option value="revenue">Passenger Ticket Booking</option>
                    <option value="other">Charter Contract Revenue</option>
                  </>
                ) : (
                  <>
                    <option value="fuel">Fuel Purchase</option>
                    <option value="maintenance">Workshop Repairs & Spares</option>
                    <option value="driver_salary">Driver & Staff Salaries</option>
                    <option value="emi">Vehicle Loan EMI</option>
                    <option value="tolls">FASTag & Tolls</option>
                    <option value="insurance">Vehicle Insurance</option>
                    <option value="other">Other Operating Expenses</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Transaction Date</label>
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
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Weekend advance booking collection"
              className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Corporate Credit Card</option>
                <option value="Cash">Cash Depot Counter</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Allocated Vehicle (Optional)</label>
              <select
                value={formData.bus_number}
                onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="">None / Corporate Fleet</option>
                {buses.map(b => (
                  <option key={b.id} value={b.bus_number}>{b.bus_number} — {b.model}</option>
                ))}
              </select>
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
              Post Transaction
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={Boolean(deletingExpId)}
        onClose={() => setDeletingExpId(null)}
        onConfirm={() => {
          if (deletingExpId) deleteExpense(deletingExpId);
        }}
        title="Delete Transaction"
        message="Are you sure you want to remove this transaction entry from financial books?"
      />
    </div>
  );
};
