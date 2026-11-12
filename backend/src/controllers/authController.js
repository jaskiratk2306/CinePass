import { registerUser, loginUser, getProfile } from '../services/authService.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Controller: Register user
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await registerUser({ name, email, password });

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(201).json({
      message: 'Registration successful',
      user,
      token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: User login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(200).json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: Get current user profile
 */
export async function getMe(req, res, next) {
  try {
    const user = await getProfile(req.user.id);
    return res.status(200).json({
      user,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: Logout user by clearing cookie
 */
export async function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTIONS);
  return res.status(200).json({
    message: 'Logged out successfully',
  });
}
