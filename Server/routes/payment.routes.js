import express from 'express';
import { verifyPayment } from '../controllers/payment.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/payments/verify — verify Razorpay payment signature
router.post('/verify', authMiddleware, verifyPayment);

export default router;
