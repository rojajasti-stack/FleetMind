import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, ExternalLink, Filter, AlertTriangle,
  Calendar, Wrench, Shield, CreditCard, Package, Info
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { NotificationItem, NotificationType } from '../types';
import { formatDateTime } from '../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification
  } = useFleetData();

  const [tabFilter, setTabFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredNotifs = notifications.filter(n => {
    const matchesTab =
      tabFilter === 'all' ||
      (tabFilter === 'unread' && !n.read) ||
      (tabFilter === 'critical' && n.severity === 'critical');
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    return matchesTab && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-4 h-4 text-amber-400" />;
      case 'license': return <Calendar className="w-4 h-4 text-rose-400" />;
      case 'inventory': return <Package className="w-4 h-4 text-purple-400" />;
      case 'emi': return <CreditCard className="w-4 h-4 text-[#00C2FF]" />;
      case 'insurance': return <Shield className="w-4 h-4 text-blue-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[#00C2FF]" />
            Fleet Notification Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time compliance alerts, overdue maintenance warnings, upcoming vehicle EMIs, and inventory triggers.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsAsRead()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-[#0F2742] rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#08111F] p-1 rounded-xl border border-white/10 w-full md:w-auto">
          {(['all', 'unread', 'critical'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTabFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tabFilter === t
                  ? 'bg-[#00C2FF] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'unread' ? `Unread (${unreadCount})` : t}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#08111F] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#00C2FF]/50"
        >
          <option value="all">All Alert Categories</option>
          <option value="maintenance">Maintenance</option>
          <option value="license">Driver Licence</option>
          <option value="inventory">Inventory Stock</option>
          <option value="emi">Vehicle Loan EMI</option>
          <option value="insurance">Insurance Policy</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="bg-[#0F2742] rounded-2xl p-12 text-center text-slate-400 text-xs border border-white/5">
            No notifications matching the selected filter criteria.
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              className={`bg-[#0F2742] rounded-2xl p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !n.read
                  ? 'border-[#00C2FF]/40 bg-gradient-to-r from-[#0F2742] to-blue-950/30 shadow-md shadow-[#00C2FF]/5'
                  : 'border-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  n.severity === 'critical' ? 'bg-rose-500/10 border border-rose-500/20' :
                  n.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'
                }`}>
                  {getTypeIcon(n.type)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm font-heading">{n.title}</h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#00C2FF] shrink-0" />
                    )}
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      n.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                      n.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-[#00C2FF]'
                    }`}>
                      {n.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">{n.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block">{formatDateTime(n.date)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {n.link && (
                  <button
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      navigate(n.link!);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-[#00C2FF] transition-colors"
                  >
                    Resolve <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                {!n.read && (
                  <button
                    onClick={() => markNotificationAsRead(n.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Mark as Read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Dismiss Notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
