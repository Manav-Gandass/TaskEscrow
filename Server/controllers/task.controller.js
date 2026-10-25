import Task from '../models/task.model.js';
import Bid from '../models/bid.model.js';

/**
 * POST /api/tasks
 * Client only — creates a new task.
 */
export const createTask = async (req, res) => {
  try {
    const { title, description, budget, deadline } = req.body;

    if (!title || !description || !budget || !deadline) {
      return res.status(400).json({ message: 'All fields (title, description, budget, deadline) are required.' });
    }

    if (Number(budget) <= 0) {
      return res.status(400).json({ message: 'Budget must be greater than 0.' });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ message: 'Deadline must be a valid date.' });
    }

    if (deadlineDate <= new Date()) {
      return res.status(400).json({ message: 'Deadline must be a future date.' });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      budget: Number(budget),
      deadline: deadlineDate,
      client: req.user._id,
      status: 'OPEN',
    });

    return res.status(201).json({ message: 'Task created successfully.', task });
  } catch (error) {
    console.error('createTask error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/tasks
 * Returns all OPEN tasks, newest first.
 */
export const getAllOpenTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ status: 'OPEN' })
      .populate('client', 'fullName')
      .sort({ createdAt: -1 });

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error('getAllOpenTasks error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/tasks/my
 * Returns tasks belonging to the authenticated user (role-aware).
 */
export const getMyTasks = async (req, res) => {
  try {
    let tasks;

    if (req.user.role === 'client') {
      tasks = await Task.find({ client: req.user._id })
        .populate('client', 'fullName')
        .populate('freelancer', 'fullName')
        .sort({ createdAt: -1 });
    } else {
      tasks = await Task.find({ freelancer: req.user._id })
        .populate('client', 'fullName')
        .populate('freelancer', 'fullName')
        .sort({ createdAt: -1 });
    }

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error('getMyTasks error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/tasks/:id
 * Returns a single task by ID with client (fullName, email) and freelancer (fullName).
 */
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('client', 'fullName email')
      .populate('freelancer', 'fullName');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    let myBid = null;
    if (req.user && req.user.role === 'freelancer') {
      myBid = await Bid.findOne({ task: task._id, freelancer: req.user._id });
    }

    return res.status(200).json({ task, myBid });
  } catch (error) {
    console.error('getTaskById error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * DELETE /api/tasks/:id
 * Client only — cancels an OPEN task that belongs to the requesting client.
 */
export const cancelTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    if (task.status !== 'OPEN') {
      return res.status(400).json({ message: 'Only OPEN tasks can be cancelled.' });
    }

    task.status = 'CANCELLED';
    await task.save();

    return res.status(200).json({ message: 'Task cancelled successfully.', task });
  } catch (error) {
    console.error('cancelTask error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
