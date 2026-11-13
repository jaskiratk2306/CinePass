import React from 'react';
import { Film, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-zinc-900 bg-zinc-950/50 py-10 text-sm text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-zinc-300">CinePass</span>
          <span>• Full-Stack Cinema Hall Ticket Booking System</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PostgreSQL DB Level Concurrency Protection
          </span>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Swagger OpenAPI Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
