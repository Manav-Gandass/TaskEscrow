import express from 'express';
import { getWallet, withdraw } from '../controllers/wallet.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/wallet — get wallet balance and transaction history
router.get('/', authMiddleware, getWallet);

// POST /api/wallet/withdraw — mock withdrawal from wallet
router.post('/withdraw', authMiddleware, withdraw);

export default router;
