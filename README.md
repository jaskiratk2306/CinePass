# CinePass — Cinema Hall Ticket Booking System

A production-ready full-stack Cinema Hall Ticket Booking System built with a layered modular monolith backend, PostgreSQL with database-level concurrency protection, real-time seat reservation with lazy hold expiration, and a responsive React frontend.

---

## 1. System Architecture

The project is structured as a monorepo containing `/backend`, `/frontend`, and `/docs`.

```
cinema-ticket-booking-system/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # PostgreSQL migrations (including partial unique index)
│   │   ├── schema.prisma        # 14 entities, enums, indexes, and constraints
│   │   └── seed.js              # Comprehensive demo dataset (Admin, Users, Theatres, Movies, Shows)
│   ├── src/
│   │   ├── config/              # Prisma singleton & environment config
│   │   ├── controllers/         # HTTP request/response handlers (thin)
│   │   ├── docs/                # OpenAPI 3.0.3 specification generator
│   │   ├── errors/              # AppError hierarchy with HTTP status mappings
│   │   ├── middlewares/         # Central error handler, Zod validator, JWT/RBAC auth
│   │   ├── repositories/        # Prisma data access layer with interactive transactions
│   │   ├── routes/              # Express route declarations (auth, catalog, booking, admin)
│   │   ├── services/            # Core business logic (holds, bookings, refunds, reports)
│   │   ├── utils/               # Generators (ref, QR token), password bcrypt, audit logger
│   │   ├── validators/          # Zod input schemas for params, queries, and bodies
│   │   ├── app.js               # Express application initialization & middleware setup
│   │   └── server.js            # HTTP server entrypoint & background hold cleanup job
│   └── tests/                   # 62 automated Vitest + Supertest integration & unit tests
├── frontend/
│   ├── src/
│   │   ├── api/                 # Fetch client with auto JWT attachment & error parsing
│   │   ├── components/          # Navbar, Footer, ProtectedRoute
│   │   ├── context/             # AuthContext (login/logout/me) & ToastContext
│   │   ├── pages/
│   │   │   ├── admin/           # Admin Dashboard, Movies, Shows, Screens, Scanner, Audit Logs
│   │   │   ├── AuthPage.jsx     # Login & Register with 1-click demo fills
│   │   │   ├── HomePage.jsx     # Movie catalog with search & genre filter pills
│   │   │   ├── MovieDetailPage.jsx # Movie synopsis & showtimes by theatre
│   │   │   ├── SeatSelectionPage.jsx # Interactive seat grid, hold timer, payment modal
│   │   │   ├── TicketSuccessPage.jsx # Booking confirmation with QR code entry pass
│   │   │   └── MyBookingsPage.jsx   # Booking history with cancellation & QR modal
│   │   ├── App.jsx              # React Router client routes
│   │   ├── main.jsx             # React DOM root with TanStack Query provider
│   │   └── index.css            # Tailwind CSS directives
│   └── vite.config.js           # Vite dev proxy configuration (/api -> :4000)
├── docs/
│   ├── ER.md                    # Mermaid ER diagram & constraint definitions
│   └── REPORT.md                # Engineering technical design report
├── docker-compose.yml           # PostgreSQL container definition
├── .env.example                 # Environment variable template
└── package.json                 # Monorepo root scripts
```

### Architectural Principles
- **Layered Architecture**: `Routes -> Validation Middleware -> Controllers -> Domain Services -> Repositories -> Database`.
- **Zero Business Logic in Transport**: Controllers and routes never execute SQL or business logic; they only handle HTTP protocol concerns.
- **Consistent Error Contract**: All operational errors format as:
  ```json
  {
    "error": {
      "code": "SEAT_UNAVAILABLE",
      "message": "One or more selected seats were just booked by another customer",
      "details": []
    }
  }
  ```

---

## 2. Core Business Rules & Guarantees

1. **Database-Level Double-Booking Prevention**:
   - Backed by a PostgreSQL partial unique index:
     ```sql
     CREATE UNIQUE INDEX "booking_seats_active_show_seat_idx" 
     ON "BookingSeat"("showId", "seatId") 
     WHERE active = true;
     ```
   - When concurrent requests race to confirm the same seat, PostgreSQL atomically permits exactly one insertion and rejects the other with a unique constraint violation (`409 SEAT_UNAVAILABLE`).
2. **Real-Time Seat Holds with Lazy Expiry**:
   - Seats can be temporarily reserved for 5 minutes (`HOLD_TTL_MINUTES`).
   - Max 8 seats per hold request.
   - Any seat query or confirmation dynamically treats `expiresAt < NOW()` as available (zero lag).
   - A background sweeper (`setInterval`) marks expired holds as `RELEASED` every 60 seconds.
3. **Strict Idempotency**:
   - `POST /api/bookings` accepts a client `idempotencyKey` enforced by `@@unique([userId, idempotencyKey])`. Re-submitting the same key returns the existing booking safely without re-charging.
4. **Cancellation Rules**:
   - Allowed only if `status === 'CONFIRMED'`, not checked in, and the show starts > 2 hours away (`CANCEL_CUTOFF_HOURS`).
   - Sets `status = 'CANCELLED'`, frees seats by setting `BookingSeat.active = false`, and processes simulated refund (`refundStatus = 'REFUNDED'`).
5. **Single-Use Ticket Validation**:
   - Admins validate attendees via `POST /api/admin/tickets/validate { qrToken }`.
   - Records `checkedInAt`. A second scan returns `409 ALREADY_USED`.
6. **Immutable Audit Trail**:
   - Every state-altering action (hold, booking, cancellation, validation, catalog mutation) appends an `AuditLog` row.

---

## 3. Demo Credentials

| Role  | Email | Password | Quick Fill |
|---|---|---|---|
| **Admin** | `admin@demo.test` | `Admin@123` | Click "Quick Fill Admin" on `/auth` |
| **Customer 1** | `user1@demo.test` | `User@123` | Click "Quick Fill User 1" on `/auth` |
| **Customer 2** | `user2@demo.test` | `User@123` | Click "Quick Fill User 2" on `/auth` |

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14 (or Docker)

### Option A: Running with Docker Compose (Local Database)
```bash
# 1. Start PostgreSQL in background
docker compose up -d

# 2. Configure environment file
cp .env.example backend/.env

# 3. Install dependencies
npm install

# 4. Run migrations & seed data
npm run db:migrate
npm run db:seed

# 5. Start development servers
npm run dev
```

### Option B: Running with Native PostgreSQL or Cloud Neon URL
1. Create a database named `cinema_booking` in your local or Neon PostgreSQL instance.
2. Update `backend/.env` with your `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cinema_booking?schema=public"
   ```
3. Run migrations and seed:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   node prisma/seed.js
   ```

### Option C: Cloud Deployment (Render + Neon + Vercel)
- **Database (Neon)**: Create a project on [neon.tech](https://neon.tech) and copy the PostgreSQL connection string.
- **Backend (Render)**:
  - Root directory: `backend`
  - Build command: `npm install && npm run deploy:prod`
  - Start command: `npm start`
  - Environment variables: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`
- **Frontend (Vercel)**:
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Environment variables: `VITE_API_URL=https://<your-render-backend-url>/api`

### Running Frontend & Backend
```bash
# Backend server (runs on port 4000)
cd backend && npm run dev

# Frontend dev server (runs on port 5173 with proxy to 4000)
cd frontend && npm run dev
```

Visit the app at: **http://localhost:5173**  
Interactive OpenAPI / Swagger Documentation: **http://localhost:4000/api/docs**

---

## 5. Automated Tests

The backend test suite contains **62 automated tests** across 8 test suites verifying unit logic, business rules, concurrency guarantees, and RBAC:

```bash
# Run all backend tests
npm test
# Or from backend directory:
cd backend && npm test
```

### Test Coverage Highlights
- `tests/unit-business-rules.test.js` — Booking ref format (`CIN-XXXXXX`), 32-byte QR token, seat price calculation, hold expiry arithmetic, cancellation cutoff logic.
- `tests/concurrency.test.js` — **Simultaneous Promise.all race**: two users attempt to confirm the same seat concurrently. Proves exactly one receives `201 Created` and the other receives `409 SEAT_UNAVAILABLE`, with the database holding exactly 1 active seat.
- `tests/booking-flow.test.js` — End-to-end flow: hold seats, confirm booking, idempotency key replay, expired hold seat release, cancellation cutoff enforcement, ticket validation single-use guard (`409 ALREADY_USED`).
- `tests/reports.test.js` — Occupancy and revenue reconciliation: verifies `bookedSeats`, `cancelledSeats`, `netRevenue` reconcile mathematically after book-and-cancel sequences.
- `tests/auth.test.js` — Password hashing, JWT issuance, token verification, RBAC admin route protection (`401` on unauthenticated, `403` on non-admin).

---

## 6. Environment Variables

| Variable | Description | Default in `.env.example` |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/cinema_booking?schema=public` |
| `DATABASE_URL_TEST` | Optional override for testing database | `postgresql://postgres:postgres@localhost:5432/cinema_booking_test?schema=public` |
| `PORT` | Backend HTTP port | `4000` |
| `NODE_ENV` | Environment mode (`development`/`production`/`test`) | `development` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `super-secret-jwt-key...` |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `HOLD_TTL_MINUTES` | Active duration for temporary seat holds | `5` |
| `CANCEL_CUTOFF_HOURS` | Minimum hours before showtime to allow cancellation | `2` |
| `MAX_SEATS_PER_HOLD` | Maximum seats allowed in a single hold request | `8` |
| `CLIENT_URL` | CORS origin for frontend | `http://localhost:5173` |

---

## 7. Known Limitations & Tradeoffs

1. **Simulated Payment Gateway**:
   - Payment transactions are simulated internally. Specifying `cardToken: "fail"` triggers a payment failure; all other tokens succeed. In a production deployment, this would be swapped with a Stripe or Razorpay webhook handler.
2. **Single-Region PostgreSQL**:
   - The double-booking prevention relies on PostgreSQL ACID transactions and a partial unique index. For multi-region multi-primary deployments, distributed locking (e.g. Redlock) or region-sharded routing by theatre would be required.
3. **No Background Worker Queue (Redis/BullMQ)**:
   - Hold cleanup runs as an in-process `setInterval`. For multi-instance horizontal scaling, a distributed job runner or Redis TTL keys with keyspace notifications would prevent duplicate sweeper runs.
