import { prisma } from '../config/db.js';

/**
 * Finds user by email address
 * @param {string} email
 * @returns {Promise<import('@prisma/client').User|null>}
 */
export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

/**
 * Finds user by ID
 * @param {string} id
 * @returns {Promise<import('@prisma/client').User|null>}
 */
export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Creates a new user record
 * @param {object} userData
 * @param {string} userData.name
 * @param {string} userData.email
 * @param {string} userData.passwordHash
 * @param {'USER'|'ADMIN'} [userData.role]
 * @returns {Promise<import('@prisma/client').User>}
 */
export async function createUser({ name, email, passwordHash, role = 'USER' }) {
  return prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}
