import express from 'express';
import {
  createTask,
  getAllOpenTasks,
  getMyTasks,
  getTaskById,
  cancelTask,
} from '../controllers/task.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireClient } from '../middlewares/role.middleware.js';

const router = express.Router();

// POST /api/tasks — client only
router.post('/', authMiddleware, requireClient, createTask);

// GET /api/tasks — all authenticated users see open tasks
router.get('/', authMiddleware, getAllOpenTasks);

// GET /api/tasks/my — tasks belonging to the current user (role-aware)
router.get('/my', authMiddleware, getMyTasks);

// GET /api/tasks/:id — single task details
router.get('/:id', authMiddleware, getTaskById);

// DELETE /api/tasks/:id — client cancels their own OPEN task
router.delete('/:id', authMiddleware, requireClient, cancelTask);

export default router;
