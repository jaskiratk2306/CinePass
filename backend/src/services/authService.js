import { ConflictError, UnauthorizedError, NotFoundError } from '../errors/AppError.js';
import { findUserByEmail, findUserById, createUser } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Register a new user account.
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 */
export async function registerUser({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new ConflictError('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'USER',
  });

  // Write audit log
  await logAuditEvent({
    actorId: user.id,
    action: 'USER_REGISTER',
    entityType: 'USER',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return { user, token };
}

/**
 * Authenticate existing user with email and password.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 */
export async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  // Write audit log
  await logAuditEvent({
    actorId: user.id,
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user.id,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

/**
 * Retrieve current user profile by user ID.
 * @param {string} userId
 */
export async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
  }
  return user;
}
