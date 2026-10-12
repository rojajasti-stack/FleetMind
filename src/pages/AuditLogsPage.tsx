import React, { useState } from 'react';
import {
  ShieldCheck, Search, Filter, Download, Calendar, User, Clock
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { formatDateTime } from '../../src/utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs } = useFleetData();

  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCsv = () => {
    exportToCsv(auditLogs, 'FleetMind_Security_Audit_Trail', [
      { key: 'timestamp', label: 'Timestamp (UTC)' },
      { key: 'user', label: 'User / Operator' },
      { key: 'action', label: 'Action Event' },
      { key: 'entity_type', label: 'Entity Type' },
      { key: 'entity_id', label: 'Entity Identifier' },
      { key: 'details', label: 'Audit Details' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#00C2FF]" />
            System Audit & Governance Logs
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable application activity log generated from user operations, dispatches, and financial entries.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Audit Trail
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-[#0F2742] rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity or user..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-[#08111F] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#00C2FF]/50"
          >
            <option value="all">All Entity Types</option>
            <option value="Bus">Bus</option>
            <option value="Driver">Driver</option>
            <option value="Trip">Trip</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inventory">Inventory</option>
            <option value="Finance">Finance</option>
            <option value="EMI">EMI</option>
            <option value="GPS">GPS</option>
            <option value="System">System</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Operator</th>
                <th className="px-5 py-4">Action Event</th>
                <th className="px-5 py-4">Entity</th>
                <th className="px-5 py-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap font-mono">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-white">{log.user}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-200">{log.entity_type}</p>
                    <p className="text-[11px] text-[#00C2FF] font-mono">{log.entity_id}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-300 max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-[#0B1F3A] border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredLogs.length} audit trail records</span>
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
    </div>
  );
};
