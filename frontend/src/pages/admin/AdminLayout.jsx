import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Film, Calendar, Monitor, QrCode, ScrollText } from 'lucide-react';

export function AdminLayout() {
  const navItems = [
    { label: 'Occupancy & Revenue', path: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Movies', path: '/admin/movies', icon: Film },
    { label: 'Shows', path: '/admin/shows', icon: Calendar },
    { label: 'Screens & Layouts', path: '/admin/screens', icon: Monitor },
    { label: 'Ticket Scanner', path: '/admin/scanner', icon: QrCode },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-500">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cinema Administration Portal
          </h1>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL Active</span>
        </div>
      </div>

      {/* Admin Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-800/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Admin Content Outlet */}
      <Outlet />
    </div>
  );
}

