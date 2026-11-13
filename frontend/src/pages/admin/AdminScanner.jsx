import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { QrCode, CheckCircle2, AlertCircle, Clock, Film, Armchair, Hash } from 'lucide-react';
import { apiRequest } from '../../api/client.js';

export function AdminScanner() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [errorResult, setErrorResult] = useState(null);

  const validateMutation = useMutation({
    mutationFn: (qrToken) => apiRequest('/admin/tickets/validate', { method: 'POST', body: { qrToken } }),
    onSuccess: (data) => {
      setResult(data.data);
      setErrorResult(null);
    },
    onError: (err) => {
      setErrorResult(err);
      setResult(null);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setResult(null);
    setErrorResult(null);
    validateMutation.mutate(token.trim());
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
          <QrCode className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Ticket Verification Scanner</h2>
        <p className="text-xs text-zinc-400">
          Scan or input the 32-byte QR hex token to admit attendee. Double-validation is rejected server-side.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Ticket QR Token
          </label>
          <div className="relative">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. 8f9b2d... (64-character hex string)"
              required
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:border-amber-500 outline-none font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={validateMutation.isPending || !token.trim()}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {validateMutation.isPending ? 'Verifying...' : 'Validate Ticket Entry'}
        </button>
      </form>

      {/* Success result */}
      {result && (
        <div className="p-6 rounded-3xl bg-emerald-950/30 border border-emerald-900/50 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-emerald-300">Ticket Validated & Checked In</h3>
              <p className="text-xs text-zinc-400">Entry authorized for cinema admission</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-900/30 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Hash className="w-4 h-4 text-zinc-500" />
              <span>Ref: <strong className="text-white">{result.booking?.reference}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Film className="w-4 h-4 text-zinc-500" />
              <span className="truncate">{result.booking?.show?.movie?.title}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Armchair className="w-4 h-4 text-zinc-500" />
              <span>{result.booking?.seats?.length} Seat(s)</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>{new Date(result.booking?.checkedInAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error result */}
      {errorResult && (
        <div className="p-6 rounded-3xl bg-rose-950/30 border border-rose-900/50 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-rose-300">Validation Rejected</h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">Code: {errorResult.code || 'VALIDATION_FAILED'}</p>
            </div>
          </div>
          <p className="text-xs text-rose-200/80 pt-2 border-t border-rose-900/30">
            {errorResult.message}
          </p>
        </div>
      )}
    </div>
  );
}
