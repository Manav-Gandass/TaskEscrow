import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Auth middleware — extracts the JWT from the HttpOnly cookie,
 * verifies it, fetches the user and attaches them to req.user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
  }
};

export default authMiddleware;
