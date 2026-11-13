import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminShows() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    movieId: '',
    screenId: '',
    startsAt: '',
  });

  const { data: showsData, isLoading, isError, error } = useQuery({
    queryKey: ['admin-shows'],
    queryFn: () => apiRequest('/shows?pageSize=100'),
  });

  const { data: moviesData } = useQuery({
    queryKey: ['admin-movies-list'],
    queryFn: () => apiRequest('/movies?pageSize=100'),
  });

  const { data: theatresData } = useQuery({
    queryKey: ['admin-theatres-list'],
    queryFn: () => apiRequest('/admin/theatres'),
  });

  const shows = showsData?.data || [];
  const movies = moviesData?.data || [];
  const theatres = theatresData?.data || [];

  // Flatten screens from theatres
  const allScreens = theatres.flatMap((t) =>
    (t.screens || []).map((s) => ({ ...s, theatreName: t.name, theatreCity: t.city }))
  );

  const createMutation = useMutation({
    mutationFn: (body) => apiRequest('/admin/shows', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
      addToast('Show scheduled successfully', 'success');
      resetForm();
    },
    onError: (err) => addToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/admin/shows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
      addToast('Show deleted', 'success');
    },
    onError: (err) => addToast(err.message, 'error'),
  });

  function resetForm() {
    setForm({ movieId: '', screenId: '', startsAt: '' });
    setShowForm(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.movieId || !form.screenId || !form.startsAt) {
      addToast('All fields are required', 'error');
      return;
    }
    createMutation.mutate({
      movieId: form.movieId,
      screenId: form.screenId,
      startsAt: new Date(form.startsAt).toISOString(),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300">{error?.message || 'Failed to load shows'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Scheduled Shows ({shows.length})</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
        >
          <Plus className="w-4 h-4" /> Schedule Show
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Schedule New Show</h3>
            <button type="button" onClick={resetForm} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Movie</label>
              <select
                value={form.movieId}
                onChange={(e) => setForm((f) => ({ ...f, movieId: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none"
              >
                <option value="">Select Movie</option>
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.durationMin}m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Screen / Theatre</label>
              <select
                value={form.screenId}
                onChange={(e) => setForm((f) => ({ ...f, screenId: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none"
              >
                <option value="">Select Screen</option>
                {allScreens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.theatreName} ({s.theatreCity}) - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
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
              <Save className="w-4 h-4" /> Save Show
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold">Movie</th>
              <th className="px-4 py-3 font-semibold">Theatre / Screen</th>
              <th className="px-4 py-3 font-semibold">Start Time</th>
              <th className="px-4 py-3 font-semibold">End Time</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {shows.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-900/40 text-zinc-300">
                <td className="px-4 py-3 font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{s.movie?.title || 'Unknown Movie'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {s.screen?.theatre?.name || 'Theatre'} - <span className="text-zinc-500">{s.screen?.name || 'Screen'}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(s.startsAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(s.endsAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Delete this show?')) deleteMutation.mutate(s.id);
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                    aria-label="Delete show"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {shows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No shows scheduled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
