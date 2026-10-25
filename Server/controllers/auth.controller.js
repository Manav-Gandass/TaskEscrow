import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import generateToken from '../utils/generateToken.js';

/**
 * POST /api/auth/register
 * Registers a new user (client or freelancer).
 */
export const register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!['client', 'freelancer'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either "client" or "freelancer".' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    });

    // Set auth cookie
    generateToken(user._id, res);

    return res.status(201).json({
      message: 'Registration successful.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error('register error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/login
 * Authenticates an existing user.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Set auth cookie
    generateToken(user._id, res);

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user.
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('logout error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
