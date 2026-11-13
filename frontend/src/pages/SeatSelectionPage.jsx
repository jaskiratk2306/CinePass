import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, ShieldAlert, CreditCard, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function SeatSelectionPage() {
  const { id: showId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();

  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [activeHoldData, setActiveHoldData] = useState(null);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [simulatedCard, setSimulatedCard] = useState('tok_valid');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // Fetch seat map
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['show-seats', showId],
    queryFn: () => apiRequest(`/shows/${showId}/seats`),
    refetchInterval: 5000, // Poll every 5s to catch holds/bookings from other users in real time
  });

  const show = data?.data?.show;
  const seats = data?.data?.seats || [];

  // Group seats by rowLabel
  const rowsMap = useMemo(() => {
    const map = {};
    for (const seat of seats) {
      if (!map[seat.rowLabel]) {
        map[seat.rowLabel] = [];
      }
      map[seat.rowLabel].push(seat);
    }
    // Sort columns within each row
    for (const row of Object.keys(map)) {
      map[row].sort((a, b) => a.number - b.number);
    }
    return map;
  }, [seats]);

  // Distinct seat categories & prices for legend
  const categoriesLegend = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const s of seats) {
      if (!seen.has(s.category)) {
        seen.add(s.category);
        list.push({ category: s.category, price: s.price });
      }
    }
    return list;
  }, [seats]);

  // Selected seats objects
  const selectedSeats = useMemo(() => {
    return seats.filter((s) => selectedSeatIds.includes(s.id));
  }, [seats, selectedSeatIds]);

  // Live total price
  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((acc, curr) => acc + curr.price, 0);
  }, [selectedSeats]);

  // Countdown timer for active hold
  useEffect(() => {
    if (!activeHoldData?.expiresAt) {
      setTimeLeftSec(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(activeHoldData.expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeftSec(diffSec);

      if (diffSec === 0) {
        setActiveHoldData(null);
        setSelectedSeatIds([]);
        toast.error('Your seat hold has expired. Please select seats again.');
        refetch();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeHoldData, toast, refetch]);

  // Toggle seat selection
  const toggleSeat = (seat) => {
    if (activeHoldData) {
      toast.info('You have seats currently on hold. Complete booking or let timer expire.');
      return;
    }

    if (seat.status === 'BOOKED') {
      toast.error('This seat is already booked.');
      return;
    }

    if (seat.status === 'HELD' && !seat.isMine) {
      toast.error('This seat is currently held by another customer.');
      return;
    }

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
    } else {
      if (selectedSeatIds.length >= 8) {
        toast.error('You can hold a maximum of 8 seats at once.');
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seat.id]);
    }
  };

  // Hold Seats Mutation
  const holdMutation = useMutation({
    mutationFn: (seatIds) =>
      apiRequest(`/shows/${showId}/holds`, {
        method: 'POST',
        body: { seatIds },
      }),
    onSuccess: (data) => {
      setActiveHoldData(data);
      toast.success('Seats held for 5 minutes! Proceed to payment.');
      queryClient.invalidateQueries(['show-seats', showId]);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to hold seats');
      queryClient.invalidateQueries(['show-seats', showId]);
    },
  });

  const handleHoldSeats = () => {
    if (!user) {
      toast.info('Please sign in to reserve seats.');
      navigate('/auth', { state: { from: { pathname: `/shows/${showId}/seats` } } });
      return;
    }
    if (selectedSeatIds.length === 0) {
      toast.error('Please select at least 1 seat.');
      return;
    }
    holdMutation.mutate(selectedSeatIds);
  };

  // Confirm Booking
  const handleConfirmBooking = async () => {
    setIsBookingSubmitting(true);
    try {
      const idempotencyKey = `idemp-${user.id}-${showId}-${Date.now()}`;
      const res = await apiRequest('/bookings', {
        method: 'POST',
        body: {
          showId,
          seatIds: selectedSeatIds,
          idempotencyKey,
          cardToken: simulatedCard,
        },
      });

      toast.success('Booking confirmed successfully!');
      setShowPaymentModal(false);
      navigate(`/tickets/${res.booking.id}`, { state: { booking: res.booking } });
    } catch (err) {
      toast.error(err.message || 'Booking confirmation failed');
      if (err.code === 'SEAT_UNAVAILABLE' || err.code === 'HOLD_EXPIRED_OR_INVALID') {
        setActiveHoldData(null);
        setSelectedSeatIds([]);
        setShowPaymentModal(false);
        queryClient.invalidateQueries(['show-seats', showId]);
      }
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !show) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Show Not Found</h2>
        <p className="text-sm text-zinc-400 mt-1">{error?.message || 'Unable to load seat map'}</p>
        <Link to="/" className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  const showTimeFormatted = new Date(show.startsAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation & Info Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link
            to={`/movies/${show.movie.id}`}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
            aria-label="Back to movie"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {show.movie.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              {show.screen.theatre.name} • {show.screen.name} • <span className="text-amber-400">{showTimeFormatted}</span>
            </p>
          </div>
        </div>

        {/* Hold Countdown Timer Badge */}
        {activeHoldData && timeLeftSec > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 animate-pulse">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Hold Expires In:</span>
            <span className="text-base font-black font-mono text-amber-400">
              {formatTime(timeLeftSec)}
            </span>
          </div>
        )}
      </div>

      {/* Screen Curve Representation */}
      <div className="pt-4 pb-12 text-center">
        <div className="w-3/4 max-w-2xl mx-auto h-2.5 rounded-t-full bg-gradient-to-r from-zinc-700 via-amber-400 to-zinc-700 shadow-lg shadow-amber-400/20" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mt-3">
          All Eyes This Way • Cinema Screen
        </p>
      </div>

      {/* Seat Map Grid */}
      <div className="overflow-x-auto pb-8">
        <div className="min-w-[500px] flex flex-col items-center gap-2.5">
          {Object.entries(rowsMap).map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-3">
              {/* Row Label Left */}
              <span className="w-6 text-center text-xs font-bold text-zinc-500 font-mono">
                {rowLabel}
              </span>

              {/* Seats in Row */}
              <div className="flex items-center gap-2">
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isBooked = seat.status === 'BOOKED';
                  const isHeldByOther = seat.status === 'HELD' && !seat.isMine;
                  const isHeldByMe = (seat.status === 'HELD' && seat.isMine) || (activeHoldData && isSelected);

                  let seatStyle = 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-amber-400 hover:text-white cursor-pointer';

                  if (isBooked) {
                    seatStyle = 'bg-rose-950/40 border-rose-900/30 text-zinc-600 cursor-not-allowed opacity-50';
                  } else if (isHeldByOther) {
                    seatStyle = 'bg-amber-950/40 border-amber-800/40 text-amber-600 cursor-not-allowed';
                  } else if (isHeldByMe) {
                    seatStyle = 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/30 animate-pulse';
                  } else if (isSelected) {
                    seatStyle = 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-lg shadow-emerald-500/20 scale-105';
                  }

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => toggleSeat(seat)}
                      disabled={isBooked || isHeldByOther}
                      aria-label={`Seat ${seat.rowLabel}${seat.number}, Category ${seat.category}, Price ₹${seat.price}`}
                      className={`w-8 h-8 rounded-lg border text-[11px] font-semibold flex items-center justify-center transition-all duration-150 ${seatStyle}`}
                      title={`${seat.rowLabel}${seat.number} • ${seat.category} (₹${seat.price})`}
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>

              {/* Row Label Right */}
              <span className="w-6 text-center text-xs font-bold text-zinc-500 font-mono">
                {rowLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Categories */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700" />
            <span className="text-zinc-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-emerald-500 border border-emerald-400" />
            <span className="text-zinc-300">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-500 border border-amber-400" />
            <span className="text-zinc-300">Held (5m Lock)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-rose-950/40 border border-rose-900/30 opacity-50" />
            <span className="text-zinc-500">Booked</span>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="flex flex-wrap items-center gap-3 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-4">
          {categoriesLegend.map((cat) => (
            <span key={cat.category} className="text-zinc-400">
              <strong className="text-white">{cat.category}:</strong> ₹{cat.price}
            </span>
          ))}
        </div>
      </div>

      {/* Action Floating Summary Bar */}
      {selectedSeatIds.length > 0 && (
        <div className="sticky bottom-6 z-30 p-4 sm:p-5 rounded-3xl bg-zinc-900/95 border border-zinc-700 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 animate-slide-up">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Selected Seats ({selectedSeatIds.length}/8):
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {selectedSeats.map((s) => (
                <span
                  key={s.id}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-white"
                >
                  {s.rowLabel}{s.number} <span className="text-amber-400 font-normal">₹{s.price}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
            <div>
              <p className="text-[11px] text-zinc-400 text-right">Total Payable</p>
              <p className="text-2xl font-black text-amber-400 leading-tight">₹{totalPrice}</p>
            </div>

            {!activeHoldData ? (
              <button
                type="button"
                onClick={handleHoldSeats}
                disabled={holdMutation.isPending}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
              >
                {holdMutation.isPending ? 'Holding Seats...' : 'Hold Seats (5 Mins)'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-xl shadow-emerald-500/20 transition flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay & Confirm (₹{totalPrice})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment Simulation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-white">Simulated Checkout</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Movie</span>
                <span className="text-white font-semibold">{show.movie.title}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Seats</span>
                <span className="text-white font-semibold">
                  {selectedSeats.map((s) => `${s.rowLabel}${s.number}`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-2 border-t border-zinc-800 font-bold">
                <span className="text-white">Total Amount</span>
                <span className="text-amber-400 text-lg">₹{totalPrice}</span>
              </div>
            </div>

            {/* Simulated Card Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Payment Simulation Test Mode:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="cardSimulation"
                    checked={simulatedCard === 'tok_valid'}
                    onChange={() => setSimulatedCard('tok_valid')}
                    className="text-amber-500 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Successful Card Payment</p>
                    <p className="text-[11px] text-zinc-400">Simulates standard authorized transaction</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-rose-500/40 bg-rose-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="cardSimulation"
                    checked={simulatedCard === 'fail_insufficient_funds'}
                    onChange={() => setSimulatedCard('fail_insufficient_funds')}
                    className="text-amber-500 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-rose-300">Simulate Payment Failure</p>
                    <p className="text-[11px] text-zinc-400">Simulates declined card (triggers 400 error)</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isBookingSubmitting}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-sm font-bold text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isBookingSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

