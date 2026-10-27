import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import bidRoutes from './routes/bid.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import walletRoutes from './routes/wallet.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Trust reverse proxy (needed for secure cookies on Render/Heroku/Railway)
app.set('trust proxy', 1);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        origin === process.env.CLIENT_URL ||
        (process.env.CLIENT_URL && origin === process.env.CLIENT_URL.replace(/\/$/, '')) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost');

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true,
  })
);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/wallet', walletRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'TaskEscrow API is running.' });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Database + Server start ──────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
