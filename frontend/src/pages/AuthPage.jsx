import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Film, User, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const user = await login(email, password);
        toast.success(`Welcome back, ${user.name}!`);
        if (user.role === 'ADMIN' && from === '/') {
          navigate('/admin');
        } else {
          navigate(from, { replace: true });
        }
      } else {
        const user = await register(name, email, password);
        toast.success(`Account created! Welcome, ${user.name}.`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLogin(true);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-4 shadow-xl shadow-amber-500/5">
            <Film className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Sign in to CinePass' : 'Create your CinePass account'}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {isLogin
              ? 'Book cinema hall tickets with real-time seat locks'
              : 'Join to reserve seats, view bookings, and manage tickets'}
          </p>
        </div>

        {/* Demo Accounts Bar */}
        <div className="mb-6 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
            Quick Demo Logins:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@demo.test', 'Admin@123')}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Admin (admin@demo.test)</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('user1@demo.test', 'User@123')}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Customer 1 (user1@demo.test)</span>
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-zinc-950 p-1 mb-6 border border-zinc-800">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                isLogin ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                !isLogin ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white placeholder-zinc-600 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white placeholder-zinc-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white placeholder-zinc-600 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

