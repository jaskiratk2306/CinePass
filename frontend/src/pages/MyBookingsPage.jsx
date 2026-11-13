import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, Calendar, MapPin, AlertCircle, Ban, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { apiRequest } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export function MyBookingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiRequest('/bookings/me'),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId) =>
      apiRequest(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Booking cancelled successfully. Seats released and refund issued.');
      setCancelTargetId(null);
      queryClient.invalidateQueries(['my-bookings']);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel booking');
      setCancelTargetId(null);
    },
  });

  const bookings = data?.data || [];

  const canCancel = (booking) => {
    if (booking.status !== 'CONFIRMED') return false;
    if (booking.checkedInAt) return false;

    const showStart = new Date(booking.show.startsAt).getTime();
    const now = Date.now();
    const cutoffMs = 2 * 60 * 60 * 1000; // 2 hours
    return showStart - now > cutoffMs;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Ticket className="w-8 h-8 text-amber-500" />
          My Bookings
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          View your active reservations, digital QR tickets, and cancellation options.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-3xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 rounded-3xl bg-rose-950/20 border border-rose-900/50 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Failed to load bookings</h3>
          <p className="text-sm text-zinc-400 mt-1">{error?.message}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-16 rounded-3xl bg-zinc-900/50 border border-zinc-800 text-center space-y-3">
          <Ticket className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-200">No Bookings Yet</h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            You haven't reserved any cinema hall tickets yet. Explore movies now to book your first show!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const cancellable = canCancel(b);
            const showTime = new Date(b.show.startsAt).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            const seatsList = b.seats?.map((s) => `${s.seat?.rowLabel}${s.seat?.number}`).join(', ');

            return (
              <div
                key={b.id}
                className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-zinc-700 transition"
              >
                {/* Movie & Show Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Ref: {b.reference}
                    </span>
                    {b.checkedInAt && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        Checked-In
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white">{b.show.movie.title}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      {b.show.screen.theatre.name} • {b.show.screen.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      {showTime}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300">
                    <strong>Seats:</strong> <span className="text-amber-400 font-bold">{seatsList}</span>
                    <span className="mx-2">•</span>
                    <strong>Total:</strong> ₹{b.totalAmount}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-zinc-800">
                  <button
                    onClick={() => setSelectedTicket(b)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition flex items-center gap-1.5"
                  >
                    <span>View Ticket & QR</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => setCancelTargetId(b.id)}
                      disabled={!cancellable}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        cancellable
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-zinc-800/40 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      }`}
                      title={!cancellable ? 'Cancellation cutoff passed (less than 2h before show)' : 'Cancel booking'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{cancellable ? 'Cancel Booking' : 'Cutoff Passed'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket QR Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Digital Pass</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center space-y-2">
              <QRCodeSVG
                value={selectedTicket.qrToken}
                size={180}
                level="H"
                includeMargin={true}
              />
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                {selectedTicket.reference}
              </span>
            </div>

            <div className="space-y-1 text-center text-xs text-zinc-300">
              <p className="font-bold text-sm text-white">{selectedTicket.show.movie.title}</p>
              <p className="text-zinc-400">{selectedTicket.show.screen.theatre.name} • {selectedTicket.show.screen.name}</p>
              <p className="text-amber-400 font-bold">Seats: {selectedTicket.seats?.map((s) => `${s.seat?.rowLabel}${s.seat?.number}`).join(', ')}</p>
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Cancel Booking?</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Are you sure you want to cancel this reservation? Your seats will be immediately freed for other customers, and your refund will be processed.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate(cancelTargetId)}
                disabled={cancelMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-rose-600/20"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

