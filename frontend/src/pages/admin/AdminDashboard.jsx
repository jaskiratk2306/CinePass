import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, DollarSign, Armchair, TrendingUp, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';

export function AdminDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-occupancy-report'],
    queryFn: () => apiRequest('/admin/reports/occupancy'),
  });

  const report = data?.data;
  const summary = report?.summary;
  const shows = report?.shows || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300">{error?.message || 'Failed to load report'}</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Shows', value: summary?.totalShows ?? 0, icon: BarChart3, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: 'Total Capacity', value: summary?.totalCapacity ?? 0, icon: Armchair, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'Booked Seats', value: summary?.totalBookedSeats ?? 0, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Cancelled Seats', value: summary?.totalCancelledSeats ?? 0, icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Net Revenue', value: `₹${(summary?.netRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Refunds', value: `₹${(summary?.refunds ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Available Seats', value: summary?.totalAvailableSeats ?? 0, icon: Armchair, color: 'text-zinc-300', bg: 'bg-zinc-800 border-zinc-700' },
    { label: 'Occupancy Rate', value: `${summary?.overallOccupancyRate ?? 0}%`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  ];

  return (
    <div className="space-y-10">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`p-5 rounded-2xl border ${card.bg} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Per-Show Breakdown Table */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Per-Show Breakdown</h3>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Movie</th>
                <th className="px-4 py-3 font-semibold">Theatre / Screen</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold text-right">Capacity</th>
                <th className="px-4 py-3 font-semibold text-right">Booked</th>
                <th className="px-4 py-3 font-semibold text-right">Cancelled</th>
                <th className="px-4 py-3 font-semibold text-right">Occupancy</th>
                <th className="px-4 py-3 font-semibold text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {shows.map((s) => (
                <tr key={s.showId} className="hover:bg-zinc-900/40 text-zinc-300">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{s.movieTitle}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{s.theatre}<br /><span className="text-zinc-500">{s.screenName}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(s.startsAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                  <td className="px-4 py-3 text-right">{s.capacity}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-bold">{s.bookedSeats}</td>
                  <td className="px-4 py-3 text-right text-rose-400">{s.cancelledSeats}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${s.occupancyRate > 60 ? 'text-emerald-400' : s.occupancyRate > 30 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {s.occupancyRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">₹{s.netRevenue.toLocaleString()}</td>
                </tr>
              ))}
              {shows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">No show data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

