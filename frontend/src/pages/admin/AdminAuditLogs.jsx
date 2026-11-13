import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ChevronLeft, ChevronRight, AlertCircle, Shield } from 'lucide-react';
import { apiRequest } from '../../api/client.js';

export function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => apiRequest(`/admin/audit-logs?page=${page}&pageSize=${pageSize}`),
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300">{error?.message || 'Failed to load audit logs'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">System Audit Trail</h2>
          <p className="text-xs text-zinc-400">
            Immutable log of all material business actions (holds, bookings, cancellations, check-ins, catalog updates).
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span>Total records: {meta.total}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold">Timestamp</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Entity Type</th>
              <th className="px-4 py-3 font-semibold">Entity ID</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-900/40 text-zinc-300">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                  {new Date(log.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </td>
                <td className="px-4 py-3 font-semibold">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action.includes('CANCEL')
                        ? 'bg-rose-500/10 text-rose-400'
                        : log.action.includes('BOOK') || log.action.includes('VALIDATE')
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : log.action.includes('HOLD')
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">{log.entityType}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">
                  {log.entityId || '-'}
                </td>
                <td className="px-4 py-3">
                  {log.actor ? (
                    <div>
                      <span className="font-semibold text-white">{log.actor.name}</span>
                      <span className="text-[10px] text-zinc-500 ml-1">({log.actor.role})</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500">System</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate text-[11px] font-mono text-zinc-400" title={JSON.stringify(log.metadata)}>
                  {log.metadata ? JSON.stringify(log.metadata) : '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No audit logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            Page {page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
