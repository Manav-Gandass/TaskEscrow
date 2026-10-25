import User from '../models/user.model.js';
import Transaction from '../models/transaction.model.js';

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet balance and transaction history.
 */
export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('task', 'title')
      .sort({ createdAt: -1 });

    const currentBalance = user ? user.walletBalance : (req.user.walletBalance || 0);

    return res.status(200).json({
      walletBalance: currentBalance,
      balance: currentBalance,
      transactions,
    });
  } catch (error) {
    console.error('getWallet error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/wallet/withdraw
 * Withdraws an amount from the authenticated user's wallet (mock — no real payout).
 */
export const withdraw = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Withdrawal amount must be greater than 0.' });
    }

    const numericAmount = Number(amount);

    if (numericAmount > req.user.walletBalance) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    // Deduct from wallet
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: -numericAmount } },
      { new: true }
    );

    // Create withdrawal transaction
    await Transaction.create({
      user: req.user._id,
      type: 'WITHDRAWAL',
      amount: numericAmount,
      task: null,
      note: 'Wallet withdrawal',
    });

    return res.status(200).json({
      message: 'Withdrawal successful.',
      newBalance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('withdraw error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
