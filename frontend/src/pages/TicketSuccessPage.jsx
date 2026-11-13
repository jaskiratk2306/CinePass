import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Ticket, Printer, ArrowLeft, Calendar, MapPin, Film, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../api/client.js';

export function TicketSuccessPage() {
  const { id } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);

  useEffect(() => {
    if (booking) return;

    async function fetchBooking() {
      try {
        const res = await apiRequest('/bookings/me');
        const found = res.data?.find((b) => b.id === id);
        if (found) {
          setBooking(found);
        }
      } catch (err) {
        console.error('Failed to load booking ticket', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [id, booking]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-sm text-zinc-400 mt-1">Unable to display requested ticket details.</p>
        <Link to="/my-bookings" className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm">
          My Bookings
        </Link>
      </div>
    );
  }

  const show = booking.show;
  const showTime = new Date(show?.startsAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const seatsList = booking.seats?.map((s) => `${s.seat?.rowLabel}${s.seat?.number}`).join(', ');

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
      {/* Success Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="text-sm text-zinc-400">
          Your cinema hall ticket is reserved. Present this QR code at entry.
        </p>
      </div>

      {/* Cinema Ticket Card */}
      <div className="relative rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-2xl overflow-hidden print:border-black print:text-black">
        {/* Ticket Header */}
        <div className="p-6 bg-gradient-to-r from-amber-600 to-amber-500 text-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6" />
            <span className="font-extrabold text-lg tracking-wider uppercase">CinePass Boarding Pass</span>
          </div>
          <span className="text-xs font-mono font-black bg-black/20 px-2.5 py-1 rounded-lg">
            {booking.status}
          </span>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-6">
          {/* Reference & Movie Title */}
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-amber-400">
              Booking Ref: {booking.reference}
            </span>
            <h2 className="text-2xl font-black text-white mt-0.5 leading-tight">
              {show?.movie?.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
              <span>{show?.movie?.format}</span>
              <span>•</span>
              <span>{show?.movie?.language}</span>
              <span>•</span>
              <span>{show?.movie?.durationMin}m</span>
            </div>
          </div>

          {/* Location & Time */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> Theatre & Screen
              </span>
              <p className="font-bold text-zinc-200">{show?.screen?.theatre?.name}</p>
              <p className="text-zinc-400">{show?.screen?.name} ({show?.screen?.theatre?.city})</p>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Showtime
              </span>
              <p className="font-bold text-zinc-200">{showTime}</p>
            </div>
          </div>

          {/* Seats & Price */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
            <div>
              <span className="text-xs text-zinc-500 uppercase font-semibold">Reserved Seats</span>
              <p className="text-xl font-black text-amber-400 tracking-wide mt-0.5">{seatsList}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Total Paid</span>
              <p className="text-xl font-black text-white mt-0.5">₹{booking.totalAmount}</p>
            </div>
          </div>

          {/* Tear-off Dashed Line */}
          <div className="relative py-2 flex items-center">
            <div className="absolute -left-9 w-6 h-6 rounded-full bg-zinc-950 border-r border-zinc-700" />
            <div className="w-full border-t-2 border-dashed border-zinc-700" />
            <div className="absolute -right-9 w-6 h-6 rounded-full bg-zinc-950 border-l border-zinc-700" />
          </div>

          {/* QR Code Validation Section */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white text-black text-center space-y-3">
            <QRCodeSVG
              value={booking.qrToken}
              size={180}
              level="H"
              includeMargin={true}
            />
            <div>
              <p className="text-xs font-mono font-bold tracking-widest text-zinc-600 uppercase">
                QR Entry Token
              </p>
              <p className="text-[10px] font-mono text-zinc-400 max-w-xs break-all mt-0.5">
                {booking.qrToken}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handlePrint}
          className="w-full sm:flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-200 flex items-center justify-center gap-2 transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Ticket</span>
        </button>
        <Link
          to="/my-bookings"
          className="w-full sm:flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-sm font-bold text-black flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/10"
        >
          <Ticket className="w-4 h-4" />
          <span>Go to My Bookings</span>
        </Link>
      </div>
    </div>
  );
}

