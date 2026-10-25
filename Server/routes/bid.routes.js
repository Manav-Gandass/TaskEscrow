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

// POST /api/bids/:taskId & POST /api/bids — freelancer places a bid
router.post('/:taskId', authMiddleware, requireFreelancer, placeBid);
router.post('/', authMiddleware, requireFreelancer, placeBid);

// GET /api/bids/:taskId — client views bids for their task
router.get('/:taskId', authMiddleware, requireClient, getBidsForTask);

// PATCH & POST /api/bids/:bidId/accept — client accepts a bid (creates Razorpay order)
router.patch('/:bidId/accept', authMiddleware, requireClient, acceptBid);
router.post('/:bidId/accept', authMiddleware, requireClient, acceptBid);

// PATCH & POST /api/bids/:bidId/reject — client rejects a bid
router.patch('/:bidId/reject', authMiddleware, requireClient, rejectBid);
router.post('/:bidId/reject', authMiddleware, requireClient, rejectBid);

export default router;
