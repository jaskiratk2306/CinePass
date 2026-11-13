import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Globe, Film, Calendar, MapPin, Ticket, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client.js';

export function MovieDetailPage() {
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => apiRequest(`/movies/${id}`),
  });

  const movie = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Movie Not Found</h2>
        <p className="text-sm text-zinc-400 mt-1">{error?.message || 'Unable to retrieve movie details'}</p>
        <Link
          to="/"
          className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm"
        >
          Back to Movies
        </Link>
      </div>
    );
  }

  // Group shows by Date -> Theatre -> Screen
  const shows = movie.shows || [];

  // Extract unique show dates (YYYY-MM-DD)
  const uniqueDates = Array.from(
    new Set(
      shows.map((s) => new Date(s.startsAt).toISOString().split('T')[0])
    )
  ).sort();

  const activeDate = selectedDate || uniqueDates[0] || '';

  // Filter shows for active date
  const showsForDate = shows.filter(
    (s) => new Date(s.startsAt).toISOString().split('T')[0] === activeDate
  );

  // Group by Theatre
  const theatreMap = {};
  for (const s of showsForDate) {
    const theatreName = s.screen?.theatre?.name || 'Grand Cinema';
    const theatreCity = s.screen?.theatre?.city || 'Metropolis';
    const key = `${theatreName} (${theatreCity})`;

    if (!theatreMap[key]) {
      theatreMap[key] = [];
    }
    theatreMap[key].push(s);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Movie Details Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 items-start">
        {/* Poster */}
        <div className="relative aspect-[2/3] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-400">
            {movie.format}
          </div>
        </div>

        {/* Info */}
        <div className="md:col-span-2 lg:col-span-3 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400"
                >
                  {g}
                </span>
              ))}
              <span className="px-3 py-1 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-300">
                {movie.status === 'NOW_SHOWING' ? 'Now Showing' : 'Upcoming'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-400">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                {movie.durationMin} minutes
              </span>
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-500" />
                {movie.language}
              </span>
              <span className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-500" />
                {movie.format}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">About the Movie</h3>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-3xl">
              {movie.description}
            </p>
          </div>
        </div>
      </div>

      {/* Showtimes Section */}
      <div className="pt-8 border-t border-zinc-800 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-amber-500" />
            Select Date & Showtime
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Choose a date to view available cinema halls and showtimes
          </p>
        </div>

        {/* Date Selector Tabs */}
        {uniqueDates.length > 0 ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {uniqueDates.map((dateStr) => {
              const d = new Date(dateStr + 'T00:00:00');
              const isSelected = activeDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center min-w-[90px] py-3 px-4 rounded-2xl border transition ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wider">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-xl font-extrabold mt-0.5">
                    {d.getDate()}
                  </span>
                  <span className="text-[10px]">
                    {d.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
            <p className="text-sm text-zinc-400">No scheduled shows currently available for this movie.</p>
          </div>
        )}

        {/* Theatres & Shows List */}
        <div className="space-y-6">
          {Object.entries(theatreMap).map(([theatreKey, showList]) => (
            <div
              key={theatreKey}
              className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5"
            >
              <div className="flex items-center gap-2 text-zinc-200">
                <MapPin className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-base">{theatreKey}</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {showList.map((show) => {
                  const startTime = new Date(show.startsAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <Link
                      key={show.id}
                      to={`/shows/${show.id}/seats`}
                      className="group p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500 hover:bg-amber-500/10 transition text-center flex flex-col items-center justify-center gap-1 shadow-md"
                    >
                      <span className="text-base font-bold text-white group-hover:text-amber-400 transition">
                        {startTime}
                      </span>
                      <span className="text-[11px] text-zinc-500 line-clamp-1">
                        {show.screen?.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

