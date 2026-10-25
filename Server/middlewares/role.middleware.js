/**
 * Role-based access middleware.
 * requireClient  — allows only users whose role is 'client'.
 * requireFreelancer — allows only users whose role is 'freelancer'.
 */

export const requireClient = (req, res, next) => {
  if (req.user?.role !== 'client') {
    return res.status(403).json({ message: 'Forbidden: Clients only.' });
  }
  next();
};

export const requireFreelancer = (req, res, next) => {
  if (req.user?.role !== 'freelancer') {
    return res.status(403).json({ message: 'Forbidden: Freelancers only.' });
  }
  next();
};
