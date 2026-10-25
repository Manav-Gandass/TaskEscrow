import express from 'express';
import {
  placeBid,
  getBidsForTask,
  acceptBid,
  rejectBid,
} from '../controllers/bid.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireClient, requireFreelancer } from '../middlewares/role.middleware.js';

const router = express.Router();

// POST /api/bids/:taskId — freelancer places a bid
router.post('/:taskId', authMiddleware, requireFreelancer, placeBid);

// GET /api/bids/:taskId — client views bids for their task
router.get('/:taskId', authMiddleware, requireClient, getBidsForTask);

// PATCH /api/bids/:bidId/accept — client accepts a bid (creates Razorpay order)
router.patch('/:bidId/accept', authMiddleware, requireClient, acceptBid);

// PATCH /api/bids/:bidId/reject — client rejects a bid
router.patch('/:bidId/reject', authMiddleware, requireClient, rejectBid);

export default router;
