export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Cinema Hall Ticket Booking System API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for Cinema Hall Ticket Booking with strict concurrency guarantees, idempotent booking, and role-based access control.',
  },
  servers: [
    {
      url: '/api',
      description: 'API base path',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pass JWT token in Authorization header: Bearer <token>',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'httpOnly cookie containing JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid input parameters' },
              details: { type: 'array', items: { type: 'object' } },
            },
            required: ['code', 'message'],
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
      Movie: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          durationMin: { type: 'integer' },
          language: { type: 'string' },
          format: { type: 'string' },
          posterUrl: { type: 'string' },
          status: { type: 'string', enum: ['NOW_SHOWING', 'UPCOMING'] },
          genres: { type: 'array', items: { type: 'string' } },
        },
      },
      Seat: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rowLabel: { type: 'string' },
          number: { type: 'integer' },
          category: { type: 'string' },
          price: { type: 'number' },
          status: { type: 'string', enum: ['AVAILABLE', 'HELD', 'BOOKED'] },
          isMine: { type: 'boolean' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          reference: { type: 'string', example: 'CIN-AB12CD' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
          totalAmount: { type: 'number' },
          qrToken: { type: 'string' },
          checkedInAt: { type: 'string', nullable: true },
          refundStatus: { type: 'string', enum: ['NONE', 'PENDING', 'REFUNDED'] },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Server Health Check',
        responses: {
          200: { description: 'Server is healthy' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login user and receive JWT & httpOnly cookie',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid email or password', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: { description: 'Profile retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/movies': {
      get: {
        summary: 'List movies with search and filters',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'genre', in: 'query', schema: { type: 'string' } },
          { name: 'language', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated movies list' },
        },
      },
    },
    '/movies/{id}': {
      get: {
        summary: 'Get movie details with upcoming shows',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Movie details' },
          404: { description: 'Movie not found' },
        },
      },
    },
    '/shows': {
      get: {
        summary: 'List scheduled upcoming shows',
        parameters: [
          { name: 'movieId', in: 'query', schema: { type: 'string' } },
          { name: 'theatreId', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Shows list' },
        },
      },
    },
    '/shows/{id}/seats': {
      get: {
        summary: 'Get real-time seat map and availability for a show',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: { description: 'Seat map with AVAILABLE, HELD, BOOKED states' },
          404: { description: 'Show not found' },
        },
      },
    },
    '/shows/{id}/holds': {
      post: {
        summary: 'Hold seats for 5 minutes (max 8 seats)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['seatIds'],
                properties: {
                  seatIds: { type: 'array', items: { type: 'string' }, maxItems: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Seats held successfully' },
          409: { description: 'Seats currently held or booked' },
        },
      },
    },
    '/bookings': {
      post: {
        summary: 'Confirm booking with unexpired hold, idempotency, and payment',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['showId', 'idempotencyKey'],
                properties: {
                  showId: { type: 'string' },
                  seatIds: { type: 'array', items: { type: 'string' } },
                  holdIds: { type: 'array', items: { type: 'string' } },
                  idempotencyKey: { type: 'string' },
                  cardToken: { type: 'string', default: 'tok_visa' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Booking confirmed' },
          200: { description: 'Idempotent replay of previously confirmed booking' },
          409: { description: 'Seats unavailable or concurrent conflict' },
        },
      },
    },
    '/bookings/me': {
      get: {
        summary: 'Get customer booking history',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: { description: 'Customer bookings' },
        },
      },
    },
    '/bookings/{id}/cancel': {
      post: {
        summary: 'Cancel booking (frees seats, simulated refund)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: { description: 'Booking cancelled' },
          409: { description: 'Cutoff window exceeded or invalid state' },
        },
      },
    },
    '/admin/tickets/validate': {
      post: {
        summary: 'Validate QR ticket (Admin only)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['qrToken'],
                properties: {
                  qrToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Ticket validated successfully' },
          409: { description: 'Ticket already used or cancelled' },
        },
      },
    },
    '/admin/reports/occupancy': {
      get: {
        summary: 'Reconciled occupancy and revenue report (Admin only)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          { name: 'showId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Occupancy and revenue reconciliation report' },
        },
      },
    },
    '/admin/audit-logs': {
      get: {
        summary: 'Paginated audit log trail (Admin only)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
          { name: 'entityType', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Audit log entries' },
        },
      },
    },
  },
};
