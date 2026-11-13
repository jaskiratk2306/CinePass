# Engineering Technical Report: Cinema Hall Ticket Booking System

## 1. System Overview & Architectural Style

The Cinema Hall Ticket Booking System is engineered as a **Modular Monolith** adhering to strict layered architecture:
`HTTP Routes -> Input Validation (Zod) -> Controllers -> Domain Services (Business Logic) -> Repositories / Prisma ORM -> PostgreSQL Database`.

Key architectural principles:
- **Zero Business Logic in Transport**: Controllers and routes perform zero business logic; they only parse input, invoke domain services, and format HTTP responses.
- **Unified Error Handling**: Every operational error inherits from `AppError` and is translated by a centralized error middleware into a consistent contract: `{ error: { code: string, message: string, details?: any } }`.
- **Server-Enforced RBAC**: Authentication (`requireAuth`) and authorization (`requireRole('ADMIN')`) are enforced at the router level on all administrative and user-protected endpoints.

---

## 2. Core Architectural & Concurrency Design Decisions

### 2.1 Database-Level Double-Booking Prevention: Partial Unique Index
- **The Problem**: In high-demand cinema ticketing (e.g., flash sales or blockbuster opening nights), application-level checks ("check if seat is booked, then book") suffer from time-of-check to time-of-use (TOCTOU) race conditions. If two requests run concurrently, both can read the seat as available and proceed to insert booking records, leading to double-booked seats.
- **The Solution**: Rather than relying purely on application locks or distributed mutexes, we enforce double-booking prevention at the PostgreSQL storage engine level via a **Partial Unique Index**:
  ```sql
  CREATE UNIQUE INDEX "booking_seats_active_show_seat_idx" 
  ON "BookingSeat"("showId", "seatId") 
  WHERE active = true;
  ```
- **How It Works**:
  1. When two users simultaneously confirm booking for the same seat, both transactions attempt to insert `BookingSeat` with `active = true`.
  2. Exactly one transaction succeeds in committing. The second transaction is rejected by PostgreSQL with a unique constraint violation (`23505`).
  3. The repository catches this violation and throws a domain `ConflictError('SEAT_UNAVAILABLE', 'One or more selected seats were just booked by another customer')`, returning HTTP 409.
  4. When a user cancels a booking, `BookingSeat.active` is set to `false`, freeing the seat for subsequent bookings while preserving the historical booking record.

### 2.2 Lazy Hold Expiry & Hybrid Background Sweeper
- **The Problem**: Periodic cron jobs that sweep expired holds every second incur unnecessary database I/O and can still leave a millisecond window where an expired hold prevents another customer from holding or booking the seat.
- **The Solution**: A **hybrid model**:
  1. **Lazy Expiry on Read & Write**: Every seat availability query, seat hold request, and booking confirmation dynamically checks `expiresAt > NOW()`. Any hold where `expiresAt <= NOW()` is immediately treated as non-existent and free for holding.
  2. **Active State Sweeper**: A lightweight, unref'd `setInterval` runs every 60 seconds marking expired holds as `status = 'RELEASED'`. This keeps database indexes compact and reduces clutter without introducing synchronization dependencies.

### 2.3 Strict Idempotency via Unique Composite Keys
- **The Problem**: Unstable mobile connections and double-clicking the payment button can submit duplicate booking confirmation requests, risking double billing.
- **The Solution**: 
  - Every booking confirmation accepts an `idempotencyKey` provided by the client.
  - The database enforces a unique composite constraint: `@@unique([userId, idempotencyKey])`.
  - When the service detects an existing booking matching `(userId, idempotencyKey)`, it immediately returns the original confirmed booking without re-executing payment or allocating new seats.

### 2.4 Atomicity via `prisma.$transaction`
- All multi-step state mutations (such as validating holds, creating booking headers, inserting seat rows, generating references, updating hold status to `CONVERTED`, and appending audit trail logs) are executed inside an interactive PostgreSQL transaction (`prisma.$transaction`). If any step or constraint fails, the entire unit of work rolls back cleanly.

### 2.5 Role-Based Access Control (RBAC) & Single-Use Ticket Validation
- **Token Format**: Secure JWT with user ID, email, and role payload, supported via Bearer header and HTTP-only cookies.
- **Administrative Ticket Scanner**:
  - Each booking receives a cryptographically secure 32-byte hex token (`qrToken`).
  - At admission, the admin scanner submits `POST /api/admin/tickets/validate { qrToken }`.
  - The transaction verifies that `status === 'CONFIRMED'`, `checkedInAt === null`, and the show has not started past the limit.
  - Upon success, `checkedInAt = new Date()` is recorded. A second attempt returns `409 ALREADY_USED`.

### 2.6 Financial & Occupancy Reconciliation
- The occupancy reporting service (`GET /api/admin/reports/occupancy`) strictly reconciles:
  - `Booked Seats` = Count of active `BookingSeat` records where parent `Booking.status === 'CONFIRMED'`.
  - `Net Revenue` = Sum of confirmed booking totals minus refunded booking totals.
  - `Available Seats` = Total Screen Capacity minus currently booked seats.

---

## 3. Tradeoffs & Pragmatic Decisions

1. **Simulated Payment Gateway**:
   - *Tradeoff*: Used a simulated payment module with deterministic test vectors (`cardToken: "fail"` simulates card decline; any other string succeeds).
   - *Rationale*: Allows end-to-end integration testing and automated CI runs without external Stripe/Razorpay network dependencies or API keys.
2. **Plain JavaScript (ES Modules) vs TypeScript**:
   - *Tradeoff*: Per user directive, the codebase uses standard ES Modules (`.js`, `.jsx`) with Zod schemas for runtime boundary typing, JSDoc annotations for IDE intelligence, and Vite/Node native execution.
   - *Rationale*: Eliminates compilation overhead, allows instant startup, and avoids mismatch issues across transpile targets.
3. **In-Database Holds vs Distributed Redis Locks**:
   - *Tradeoff*: Holds are stored in PostgreSQL rather than an ephemeral Redis cluster.
   - *Rationale*: With PostgreSQL's row-level locking and indexed `(showId, expiresAt)`, the single-database architecture drastically simplifies local development, Docker deployment, and transactional atomicity (holds and bookings share the exact same ACID transaction).

---

## 4. AI Tools Used

- **Antigravity AI (Google DeepMind)** was utilized for:
  - Architecture and schema design scaffolding.
  - Writing comprehensive Vitest unit and integration test suites covering concurrent booking races, lazy hold expirations, and cancellation cutoff windows.
  - Drafting full-stack React components and OpenAPI 3.0 documentation.
