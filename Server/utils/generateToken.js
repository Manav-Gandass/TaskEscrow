import jwt from 'jsonwebtoken';

/**
 * Generates a JWT token for the given userId and sets it as an
 * HttpOnly cookie on the response.
 *
 * @param {string} userId - The MongoDB _id of the user.
 * @param {object} res    - The Express response object.
 */
const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return token;
};

export default generateToken;
