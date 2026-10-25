import crypto from 'crypto';
import Task from '../models/task.model.js';
import Bid from '../models/bid.model.js';
import Transaction from '../models/transaction.model.js';

/**
 * POST /api/payments/verify
 * Verifies a Razorpay payment signature, locks funds in escrow,
 * and moves the task to IN_PROGRESS.
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      taskId,
      bidId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !taskId || !bidId) {
      return res.status(400).json({ message: 'All payment fields are required.' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found.' });
    }

    // Ensure the task belongs to the authenticated client
    if (task.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    // HMAC-SHA256 signature verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    let isSignatureValid = false;
    try {
      const genBuf = Buffer.from(generatedSignature, 'utf-8');
      const sigBuf = Buffer.from(razorpay_signature, 'utf-8');
      isSignatureValid =
        genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      return res.status(400).json({ message: 'Payment verification failed: invalid signature.' });
    }

    // Update task
    task.status = 'IN_PROGRESS';
    task.freelancer = bid.freelancer;
    task.razorpayOrderId = razorpay_order_id;
    task.razorpayPaymentId = razorpay_payment_id;
    await task.save();

    // Accept the winning bid
    bid.status = 'ACCEPTED';
    await bid.save();

    // Reject all other PENDING bids on this task
    await Bid.updateMany(
      { task: task._id, _id: { $ne: bid._id }, status: 'PENDING' },
      { $set: { status: 'REJECTED' } }
    );

    // Create escrow lock transaction
    await Transaction.create({
      user: req.user._id,
      type: 'ESCROW_LOCK',
      amount: task.budget,
      task: task._id,
      note: 'Funds locked in escrow',
    });

    const updatedTask = await Task.findById(task._id)
      .populate('client', 'fullName email')
      .populate('freelancer', 'fullName');

    return res.status(200).json({
      message: 'Payment verified. Task is now IN_PROGRESS.',
      task: updatedTask,
    });
  } catch (error) {
    console.error('verifyPayment error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
