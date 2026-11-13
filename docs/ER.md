# Entity-Relationship (ER) Diagram

This document illustrates the complete data model for the Cinema Hall Ticket Booking System, implemented using PostgreSQL and Prisma ORM.

```mermaid
erDiagram
    User ||--o{ Booking : "places"
    User ||--o{ SeatHold : "creates"
    User ||--o{ AuditLog : "initiates (actor)"
    
    Movie ||--|{ MovieGenre : "categorized as"
    Genre ||--|{ MovieGenre : "includes"
    Movie ||--o{ Show : "scheduled for"

    Theatre ||--|{ Screen : "contains"
    Screen ||--|{ Seat : "has"
    Screen ||--o{ Show : "hosts"

    SeatCategory ||--|{ Seat : "classifies"

    Show ||--o{ SeatHold : "holds seats on"
    Show ||--o{ Booking : "has bookings"
    Show ||--o{ BookingSeat : "allocates seats for"

    Seat ||--o{ SeatHold : "temporarily reserved by"
    Seat ||--o{ BookingSeat : "permanently booked as"

    Booking ||--|{ BookingSeat : "contains"
    Booking ||--o| Payment : "settled by"

    User {
        string id PK "cuid"
        string name
        string email UK "unique"
        string passwordHash
        string role "USER | ADMIN"
        datetime createdAt
        datetime updatedAt
    }

    Genre {
        string id PK "cuid"
        string name UK "unique"
    }

    Movie {
        string id PK "cuid"
        string title
        string description
        int durationMin
        string language
        string format "2D | 3D | IMAX | 4DX"
        string posterUrl
        string status "NOW_SHOWING | UPCOMING"
        datetime createdAt
        datetime updatedAt
    }

    MovieGenre {
        string movieId PK, FK
        string genreId PK, FK
    }

    Theatre {
        string id PK "cuid"
        string name
        string city
        datetime createdAt
        datetime updatedAt
    }

    Screen {
        string id PK "cuid"
        string theatreId FK
        string name
        int rows
        int cols
    }

    SeatCategory {
        string id PK "cuid"
        string name UK "REGULAR | PREMIUM | VIP"
        decimal basePrice
    }

    Seat {
        string id PK "cuid"
        string screenId FK
        string rowLabel
        int number
        string categoryId FK
    }

    Show {
        string id PK "cuid"
        string movieId FK
        string screenId FK
        datetime startsAt
        datetime endsAt
        string status "SCHEDULED | CANCELLED | COMPLETED"
        datetime createdAt
        datetime updatedAt
    }

    SeatHold {
        string id PK "cuid"
        string showId FK
        string seatId FK
        string userId FK
        datetime expiresAt
        string status "ACTIVE | RELEASED | CONVERTED"
        datetime createdAt
    }

    Booking {
        string id PK "cuid"
        string reference UK "CIN-XXXXXX"
        string userId FK
        string showId FK
        string status "PENDING | CONFIRMED | CANCELLED"
        decimal totalAmount
        string idempotencyKey "unique per user"
        string qrToken UK "32-byte hex string"
        datetime checkedInAt "nullable"
        string refundStatus "NONE | PENDING | REFUNDED"
        datetime createdAt
        datetime updatedAt
    }

    BookingSeat {
        string id PK "cuid"
        string bookingId FK
        string showId FK
        string seatId FK
        decimal priceAtBooking
        boolean active
    }

    Payment {
        string id PK "cuid"
        string bookingId FK, UK
        string status "PENDING | SUCCESS | FAILED | REFUNDED"
        string providerRef
        decimal amount
        datetime createdAt
    }

    AuditLog {
        string id PK "cuid"
        string actorId FK "nullable"
        string action
        string entityType
        string entityId "nullable"
        json metadata "nullable"
        datetime createdAt
    }
```

## Critical DB Constraints & Indexes

1. **Double Booking Prevention (Database-Level Guarantee):**
   - **Partial Unique Index**:
     ```sql
     CREATE UNIQUE INDEX "booking_seats_active_show_seat_idx" 
     ON "BookingSeat"("showId", "seatId") 
     WHERE active = true;
     ```
     This PostgreSQL partial index ensures that no two active booking seats can ever exist for the same show and seat concurrently, even under massive race conditions. When a booking is cancelled, setting `active = false` frees the seat instantly.

2. **Idempotency Guarantee:**
   - Unique composite constraint: `@@unique([userId, idempotencyKey])` on `Booking`.
   - Prevents duplicate payments and duplicate booking records on network retry or button double-click.

3. **Seat Map Uniqueness:**
   - Composite index: `@@unique([screenId, rowLabel, number])` on `Seat`.

4. **Show Overlap Prevention:**
   - Screen scheduling queries enforce that a new show cannot start while an existing show is still running (`startsAt < newEnd && endsAt > newStart`).

5. **Performance Indexes:**
   - `Show(startsAt)`, `Show(movieId)`, `Show(screenId, startsAt)`
   - `Booking(userId)`, `Booking(showId)`
   - `SeatHold(showId, expiresAt)`, `SeatHold(userId)`
   - `AuditLog(actorId)`, `AuditLog(entityType, entityId)`, `AuditLog(createdAt)`
