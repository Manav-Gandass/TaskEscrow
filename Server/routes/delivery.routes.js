import express from 'express';
import {
  submitDeliverable,
  approveDelivery,
  requestRevision,
  refundClient,
} from '../controllers/delivery.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireClient, requireFreelancer } from '../middlewares/role.middleware.js';

const router = express.Router();

// POST /api/delivery/:taskId/submit — freelancer submits deliverable
router.post('/:taskId/submit', authMiddleware, requireFreelancer, submitDeliverable);

// POST /api/delivery/:taskId/approve — client approves delivery and releases payment
router.post('/:taskId/approve', authMiddleware, requireClient, approveDelivery);

// POST /api/delivery/:taskId/revision — client requests a revision
router.post('/:taskId/revision', authMiddleware, requireClient, requestRevision);

// POST /api/delivery/:taskId/refund — client claims refund after missed deadline
router.post('/:taskId/refund', authMiddleware, requireClient, refundClient);

export default router;
