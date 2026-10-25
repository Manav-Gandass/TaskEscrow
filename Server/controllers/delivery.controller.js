import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Transaction from '../models/transaction.model.js';

/**
 * POST /api/delivery/:taskId/submit
 * Freelancer only — submits deliverable for a task they are assigned to.
 */
export const submitDeliverable = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { deliverable, deliverableNote } = req.body;

    if (!deliverable || deliverable.trim() === '') {
      return res.status(400).json({ message: 'Deliverable cannot be empty.' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Task must be IN_PROGRESS to submit a deliverable.' });
    }

    if (task.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned freelancer for this task.' });
    }

    task.deliverable = deliverable.trim();
    task.deliverableNote = deliverableNote ? deliverableNote.trim() : '';
    task.status = 'UNDER_REVIEW';
    await task.save();

    return res.status(200).json({ message: 'Deliverable submitted successfully. Task is now UNDER_REVIEW.', task });
  } catch (error) {
    console.error('submitDeliverable error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/delivery/:taskId/approve
 * Client only — approves the deliverable and releases payment to the freelancer's wallet.
 */
export const approveDelivery = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    if (task.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ message: 'Task must be UNDER_REVIEW to approve delivery.' });
    }

    // Mark task as completed
    task.status = 'COMPLETED';
    await task.save();

    // Credit freelancer's wallet
    await User.findByIdAndUpdate(task.freelancer, {
      $inc: { walletBalance: task.budget },
    });

    // Create payment release transaction
    await Transaction.create({
      user: task.freelancer,
      type: 'PAYMENT_RELEASE',
      amount: task.budget,
      task: task._id,
      note: 'Payment released after client approval',
    });

    const updatedTask = await Task.findById(task._id)
      .populate('client', 'fullName email')
      .populate('freelancer', 'fullName');

    return res.status(200).json({ message: 'Delivery approved. Payment released to freelancer.', task: updatedTask });
  } catch (error) {
    console.error('approveDelivery error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/delivery/:taskId/revision
 * Client only — requests revision, sends task back to IN_PROGRESS.
 */
export const requestRevision = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    if (task.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ message: 'Task must be UNDER_REVIEW to request a revision.' });
    }

    task.status = 'IN_PROGRESS';
    task.deliverable = '';
    task.deliverableNote = '';
    await task.save();

    return res.status(200).json({ message: 'Revision requested. Task is back to IN_PROGRESS.', task });
  } catch (error) {
    console.error('requestRevision error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/delivery/:taskId/refund
 * Client only — refunds the client after the task deadline has passed.
 * Task must be IN_PROGRESS or UNDER_REVIEW and deadline must have passed.
 */
export const refundClient = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    if (!['IN_PROGRESS', 'UNDER_REVIEW'].includes(task.status)) {
      return res.status(400).json({ message: 'Refund is only allowed for tasks that are IN_PROGRESS or UNDER_REVIEW.' });
    }

    if (new Date() <= task.deadline) {
      return res.status(400).json({ message: 'Refund is only allowed after the task deadline has passed.' });
    }

    // Mark task as refunded
    task.status = 'REFUNDED';
    await task.save();

    // Credit client's wallet
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { walletBalance: task.budget },
    });

    // Create refund transaction
    await Transaction.create({
      user: req.user._id,
      type: 'REFUND',
      amount: task.budget,
      task: task._id,
      note: 'Refunded after missed deadline',
    });

    return res.status(200).json({ message: 'Refund processed successfully. Funds returned to your wallet.', task });
  } catch (error) {
    console.error('refundClient error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
