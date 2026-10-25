import Bid from '../models/bid.model.js';
import Task from '../models/task.model.js';
import razorpayInstance from '../config/razorpay.js';

/**
 * POST /api/bids/:taskId
 * Freelancer only — places a bid on an OPEN task.
 */
export const placeBid = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.body.taskId;
    const { pitch, portfolioLink } = req.body;

    if (!pitch) {
      return res.status(400).json({ message: 'Pitch is required.' });
    }

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.status !== 'OPEN') {
      return res.status(400).json({ message: 'You can only bid on OPEN tasks.' });
    }

    // Prevent duplicate bids from the same freelancer
    const existingBid = await Bid.findOne({ task: taskId, freelancer: req.user._id });
    if (existingBid) {
      return res.status(409).json({ message: 'You have already placed a bid on this task.' });
    }

    const bid = await Bid.create({
      task: taskId,
      freelancer: req.user._id,
      pitch,
      portfolioLink: portfolioLink || '',
    });

    return res.status(201).json({ message: 'Bid placed successfully.', bid });
  } catch (error) {
    console.error('placeBid error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/bids/:taskId
 * Client only — returns all bids for a task the client owns.
 */
export const getBidsForTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    const bids = await Bid.find({ task: taskId })
      .populate('freelancer', 'fullName email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ bids });
  } catch (error) {
    console.error('getBidsForTask error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/bids/:bidId/accept
 * Client only — creates a Razorpay order for the task budget.
 * Task status is NOT changed here; it changes only after payment verification.
 */
export const acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found.' });
    }

    const task = await Task.findById(bid.task);
    if (!task) {
      return res.status(404).json({ message: 'Associated task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    if (task.status !== 'OPEN') {
      return res.status(400).json({ message: 'Task is no longer open for bid acceptance.' });
    }

    if (bid.task.toString() !== task._id.toString()) {
      return res.status(400).json({ message: 'Bid does not belong to this task.' });
    }

    // Create Razorpay order
    const order = await razorpayInstance.orders.create({
      amount: task.budget * 100, // paise
      currency: 'INR',
      receipt: task._id.toString(),
    });

    return res.status(200).json({
      message: 'Razorpay order created. Proceed to payment.',
      razorpayOrderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID,
      taskId: task._id,
      bidId: bid._id,
    });
  } catch (error) {
    console.error('acceptBid error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/bids/:bidId/reject
 * Client only — rejects a bid.
 */
export const rejectBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found.' });
    }

    const task = await Task.findById(bid.task);
    if (!task) {
      return res.status(404).json({ message: 'Associated task not found.' });
    }

    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    bid.status = 'REJECTED';
    await bid.save();

    return res.status(200).json({ message: 'Bid rejected successfully.', bid });
  } catch (error) {
    console.error('rejectBid error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
