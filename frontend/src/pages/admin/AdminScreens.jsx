import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Plus, X, Save, Eye, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminScreens() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedScreenId, setSelectedScreenId] = useState(null);

  const [form, setForm] = useState({
    theatreId: '',
    name: 'Screen 1',
    rows: 8,
    cols: 10,
    categoryRanges: [],
  });

  const { data: theatresData, isLoading, isError, error } = useQuery({
    queryKey: ['admin-theatres'],
    queryFn: () => apiRequest('/admin/theatres'),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-seat-categories'],
    queryFn: () => apiRequest('/admin/seat-categories'),
  });

  const { data: screenDetailsData, isFetching: isScreenDetailsLoading } = useQuery({
    queryKey: ['admin-screen-details', selectedScreenId],
    queryFn: () => apiRequest(`/admin/screens/${selectedScreenId}`),
    enabled: !!selectedScreenId,
  });

  const theatres = theatresData?.data || [];
  const categories = categoriesData?.data || [];
  const screenDetails = screenDetailsData?.data;

  const createMutation = useMutation({
    mutationFn: (body) => apiRequest('/admin/screens', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatres'] });
      addToast('Screen and seats generated successfully', 'success');
      setShowForm(false);
    },
    onError: (err) => addToast(err.message, 'error'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.theatreId) {
      addToast('Please select a theatre', 'error');
      return;
    }
    // Default fallback category if ranges not provided
    const payload = {
      theatreId: form.theatreId,
      name: form.name,
      rows: Number(form.rows),
      cols: Number(form.cols),
    };
    if (categories.length > 0) {
      // Map all rows to default category if no ranges
      payload.categoryRanges = [
        {
          startRow: 'A',
          endRow: String.fromCharCode(64 + Number(form.rows)),
          categoryId: categories[0].id,
        },
      ];
    }
    createMutation.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300">{error?.message || 'Failed to load screens'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Theatres & Screens</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
        >
          <Plus className="w-4 h-4" /> Add Screen
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Generate Screen & Seat Layout</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Theatre</label>
              <select
                value={form.theatreId}
                onChange={(e) => setForm((f) => ({ ...f, theatreId: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none"
              >
                <option value="">Select Theatre</option>
                {theatres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Screen Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rows (A-Z)</label>
              <input
                type="number"
                min="1"
                max="26"
                value={form.rows}
                onChange={(e) => setForm((f) => ({ ...f, rows: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Columns (Seats/Row)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={form.cols}
                onChange={(e) => setForm((f) => ({ ...f, cols: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Generate Layout ({form.rows * form.cols} seats)
            </button>
          </div>
        </form>
      )}

      {/* Theatres listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {theatres.map((t) => (
          <div key={t.id} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{t.name}</h3>
                <p className="text-xs text-zinc-500">{t.city}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-zinc-300 font-semibold">
                {t.screens?.length || 0} Screens
              </span>
            </div>

            <div className="space-y-2">
              {(t.screens || []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-bold text-white">{s.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {s.rows} rows × {s.cols} cols ({s.rows * s.cols} capacity)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScreenId(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs text-white transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Layout
                  </button>
                </div>
              ))}
              {(!t.screens || t.screens.length === 0) && (
                <p className="text-xs text-zinc-500 italic">No screens yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Screen layout modal */}
      {selectedScreenId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {screenDetails?.name || 'Screen'} Seat Layout
                </h3>
                <p className="text-xs text-zinc-400">
                  {screenDetails?.theatre?.name} • Total Seats: {screenDetails?.seats?.length || 0}
                </p>
              </div>
              <button
                onClick={() => setSelectedScreenId(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isScreenDetailsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-3/4 mx-auto h-2 bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full shadow-[0_4px_20px_rgba(245,158,11,0.5)]" />
                <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest">Screen</p>

                <div className="max-h-96 overflow-auto p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center gap-2">
                  {/* Group seats by row */}
                  {Array.from(
                    new Set((screenDetails?.seats || []).map((s) => s.rowLabel))
                  )
                    .sort()
                    .map((row) => (
                      <div key={row} className="flex items-center gap-2">
                        <span className="w-6 text-xs text-zinc-500 font-bold text-center">{row}</span>
                        <div className="flex gap-1">
                          {(screenDetails?.seats || [])
                            .filter((s) => s.rowLabel === row)
                            .sort((a, b) => a.number - b.number)
                            .map((seat) => (
                              <div
                                key={seat.id}
                                className="w-6 h-6 rounded bg-zinc-800 text-[10px] flex items-center justify-center text-zinc-400 border border-zinc-700"
                                title={`Row ${seat.rowLabel}-${seat.number} (${seat.category?.name})`}
                              >
                                {seat.number}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
