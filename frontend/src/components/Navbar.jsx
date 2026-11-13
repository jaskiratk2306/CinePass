import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Ticket, ShieldCheck, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
            <Film className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-amber-400 transition">
              Cine<span className="text-amber-500">Pass</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-400">
              Cinema Hall
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className="text-zinc-300 hover:text-white transition flex items-center gap-1.5"
          >
            <Film className="w-4 h-4 text-amber-500" />
            Movies
          </Link>

          {user && (
            <Link
              to="/my-bookings"
              className="text-zinc-300 hover:text-white transition flex items-center gap-1.5"
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              My Bookings
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-amber-400 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-zinc-200 leading-none">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 leading-none mt-0.5">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition shadow-lg shadow-amber-500/10 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-zinc-200 hover:bg-zinc-900"
          >
            Movies
          </Link>
          {user && (
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-zinc-200 hover:bg-zinc-900"
            >
              My Bookings
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30"
            >
              Admin Portal
            </Link>
          )}
          <div className="pt-2 border-t border-zinc-800">
            {user ? (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-zinc-400">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
