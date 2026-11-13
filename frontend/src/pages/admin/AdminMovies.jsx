import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Plus, Trash2, Edit, X, Save, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminMovies() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', durationMin: 120, language: 'English',
    format: '2D', posterUrl: '', status: 'NOW_SHOWING', genreIds: [],
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: () => apiRequest('/movies?pageSize=100'),
  });

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => apiRequest('/genres'),
  });

  const genres = genresData?.data || [];
  const movies = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (body) => apiRequest('/admin/movies', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      addToast('Movie created successfully', 'success');
      resetForm();
    },
    onError: (err) => addToast(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiRequest(`/admin/movies/${id}`, { method: 'PUT', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      addToast('Movie updated successfully', 'success');
      resetForm();
    },
    onError: (err) => addToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/admin/movies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      addToast('Movie deleted', 'success');
    },
    onError: (err) => addToast(err.message, 'error'),
  });

  function resetForm() {
    setForm({ title: '', description: '', durationMin: 120, language: 'English', format: '2D', posterUrl: '', status: 'NOW_SHOWING', genreIds: [] });
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(movie) {
    setForm({
      title: movie.title,
      description: movie.description,
      durationMin: movie.durationMin,
      language: movie.language,
      format: movie.format,
      posterUrl: movie.posterUrl,
      status: movie.status,
      genreIds: [],
    });
    setEditingId(movie.id);
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = { ...form, durationMin: Number(form.durationMin) };
    if (body.genreIds.length === 0) delete body.genreIds;
    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function toggleGenre(genreId) {
    setForm(f => ({
      ...f,
      genreIds: f.genreIds.includes(genreId)
        ? f.genreIds.filter(id => id !== genreId)
        : [...f.genreIds, genreId],
    }));
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse" />)}</div>;
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300">{error?.message || 'Failed to load movies'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Movies ({movies.length})</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
        >
          <Plus className="w-4 h-4" /> Add Movie
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editingId ? 'Edit Movie' : 'New Movie'}</h3>
            <button type="button" onClick={resetForm} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" required className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none" />
            <input value={form.posterUrl} onChange={e => setForm(f => ({ ...f, posterUrl: e.target.value }))} placeholder="Poster URL" required className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none" />
            <input type="number" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: e.target.value }))} placeholder="Duration (min)" required min={1} className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none" />
            <input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} placeholder="Language" required className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none" />
            <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))} className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none">
              <option value="2D">2D</option>
              <option value="3D">3D</option>
              <option value="IMAX">IMAX</option>
              <option value="4DX">4DX</option>
            </select>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none">
              <option value="NOW_SHOWING">Now Showing</option>
              <option value="UPCOMING">Upcoming</option>
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" required rows={3} className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:border-amber-500 outline-none resize-none" />
          {!editingId && genres.length > 0 && (
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-2">Genres</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${form.genreIds.includes(g.id) ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition disabled:opacity-50">
            <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold">Movie</th>
              <th className="px-4 py-3 font-semibold">Language</th>
              <th className="px-4 py-3 font-semibold">Format</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {movies.map(m => (
              <tr key={m.id} className="hover:bg-zinc-900/40 text-zinc-300">
                <td className="px-4 py-3 font-semibold text-white">
                  <div className="flex items-center gap-3">
                    <Film className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-white font-bold">{m.title}</p>
                      <p className="text-[10px] text-zinc-500">{m.genres?.join(', ') || 'No genres'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{m.language}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold">{m.format}</span></td>
                <td className="px-4 py-3">{m.durationMin}m</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'NOW_SHOWING' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(m)} className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition" aria-label="Edit movie">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Delete this movie?')) deleteMutation.mutate(m.id); }} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition" aria-label="Delete movie">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {movies.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No movies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

