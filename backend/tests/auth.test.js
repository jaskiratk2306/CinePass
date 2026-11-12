import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Phase 2 - Auth, RBAC, Error Handling & Audit Log', () => {
  const testUser = {
    name: 'Auth Test User',
    email: 'auth_test_user@example.com',
    password: 'Password@123',
  };

  afterAll(async () => {
    // Cleanup created test user and related logs
    const createdUser = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    if (createdUser) {
      await prisma.auditLog.deleteMany({
        where: { actorId: createdUser.id },
      });
      await prisma.user.delete({
        where: { id: createdUser.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and write an AuditLog', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('USER');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');

      // Verify AuditLog written in DB
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'USER_REGISTER',
          entityId: res.body.user.id,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.entityType).toBe('USER');
    });

    it('should return 409 CONFLICT if email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(res.body.error.message).toBeDefined();
    });

    it('should return 400 VALIDATION_ERROR with details when payload is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A', // too short
          email: 'invalid-email',
          password: '123', // too short
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials and write an AuditLog', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);

      // Verify login audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'USER_LOGIN',
          entityId: res.body.user.id,
        },
      });
      expect(auditLog).toBeDefined();
    });

    it('should reject login with wrong password returning 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword@999',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent user returning 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_user_999@example.com',
          password: 'SomePassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    let userToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      userToken = res.body.token;
    });

    it('should return user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should return 401 UNAUTHORIZED when no authorization is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 UNAUTHORIZED when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('RBAC Middleware - Protected Routes', () => {
    let userToken;
    let adminToken;

    beforeAll(async () => {
      // Login regular user
      const userRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@demo.test',
          password: 'User@123',
        });
      userToken = userRes.body.token;

      // Login admin user
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@demo.test',
          password: 'Admin@123',
        });
      adminToken = adminRes.body.token;
    });

    it('should return 403 FORBIDDEN when regular user accesses admin-only route', async () => {
      const res = await request(app)
        .get('/api/admin/rbac-test')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 200 OK when admin accesses admin-only route', async () => {
      const res = await request(app)
        .get('/api/admin/rbac-test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome Admin');
      expect(res.body.user.role).toBe('ADMIN');
    });
  });
});
