import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

// Customer Pages
import { HomePage } from './pages/HomePage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { MovieDetailPage } from './pages/MovieDetailPage.jsx';
import { SeatSelectionPage } from './pages/SeatSelectionPage.jsx';
import { TicketSuccessPage } from './pages/TicketSuccessPage.jsx';
import { MyBookingsPage } from './pages/MyBookingsPage.jsx';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { AdminMovies } from './pages/admin/AdminMovies.jsx';
import { AdminShows } from './pages/admin/AdminShows.jsx';
import { AdminScreens } from './pages/admin/AdminScreens.jsx';
import { AdminScanner } from './pages/admin/AdminScanner.jsx';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public customer routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />

          {/* Authenticated customer booking routes */}
          <Route
            path="/shows/:id/seats"
            element={
              <ProtectedRoute>
                <SeatSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <TicketSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes (Role ADMIN server-side + client-side) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="movies" element={<AdminMovies />} />
            <Route path="shows" element={<AdminShows />} />
            <Route path="screens" element={<AdminScreens />} />
            <Route path="scanner" element={<AdminScanner />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
