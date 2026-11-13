import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Film, Clock, Globe, Sparkles, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client.js';

export function HomePage() {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Query movies
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['movies', search, selectedGenre, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search.trim()) params.append('q', search.trim());
      if (selectedGenre) params.append('genre', selectedGenre);
      return apiRequest(`/movies?${params.toString()}`);
    },
    keepPreviousData: true,
  });

  // Query genres for filter pills
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => apiRequest('/genres').catch(() => ({ data: [] })),
  });

  const genres = genresData?.data || [];
  const movies = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/40 border border-zinc-800 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Cinema Booking</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Book Blockbuster Movies in <span className="text-amber-500">Real Time</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Experience ultra-reliable ticket reservations with database-backed seat locking and instant QR entry.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search movies by title or plot..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white placeholder-zinc-500 outline-none transition"
          />
        </div>

        {/* Genre Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setSelectedGenre('');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedGenre === ''
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            All Genres
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setSelectedGenre(g.name);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedGenre === g.name
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Movies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl bg-zinc-900/50 border border-zinc-800 h-96 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 rounded-3xl bg-rose-950/20 border border-rose-900/50 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Failed to load movies</h3>
          <p className="text-sm text-zinc-400 mt-1">{error?.message || 'Please try again later'}</p>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-300">No movies found</h3>
          <p className="text-sm text-zinc-500 mt-1">Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <Link
              key={movie.id}
              to={`/movies/${movie.id}`}
              className="group flex flex-col rounded-3xl bg-zinc-900 border border-zinc-800/80 overflow-hidden hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/5 transition duration-300"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  {movie.format}
                </div>
              </div>

              {/* Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {movie.genres?.map((g) => (
                      <span
                        key={g}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition line-clamp-1">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {movie.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {movie.durationMin}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    {movie.language}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-zinc-400">
            Page <span className="text-white">{page}</span> of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

