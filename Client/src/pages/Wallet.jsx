import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const txTypeLabels = {
  ESCROW_LOCK: 'Escrow Lock',
  PAYMENT_RELEASE: 'Payment Release',
  REFUND: 'Refund',
  WITHDRAWAL: 'Withdrawal',
};

const txTypeBadge = {
  ESCROW_LOCK: 'badge-escrow',
  PAYMENT_RELEASE: 'badge-release',
  REFUND: 'badge-refund-tx',
  WITHDRAWAL: 'badge-withdrawal',
};

const Wallet = () => {
  const { user } = useAuth();

  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Withdraw
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  const fetchWallet = async () => {
    let active = true;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/wallet');
      if (active) setWalletData(res.data.wallet || res.data);
    } catch (err) {
      if (active) setError(err.response?.data?.message || 'Failed to load wallet.');
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.get('/wallet')
      .then((res) => {
        if (active) setWalletData(res.data.wallet || res.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load wallet.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    const amount = Number(withdrawAmount);
    if (!amount || amount < 1) {
      setWithdrawError('Please enter a valid amount (min ₹1).');
      return;
    }
    const currentBalance = walletData?.walletBalance ?? walletData?.balance ?? 0;
    if (amount > currentBalance) {
      setWithdrawError('Insufficient balance.');
      return;
    }

    setWithdrawLoading(true);
    try {
      await api.post('/wallet/withdraw', { amount });
      setWithdrawSuccess(`✅ ₹${amount} withdrawal initiated successfully!`);
      setWithdrawAmount('');
      setShowWithdraw(false);
      await fetchWallet();
    } catch (err) {
      setWithdrawError(err.response?.data?.message || 'Withdrawal failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const transactions = walletData?.transactions || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Wallet</h1>
          <p className="page-subtitle">Manage your earnings and withdrawals</p>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading wallet...</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-error">{error}</div>
      )}

      {!loading && !error && walletData && (
        <>
          {/* ── Balance Card ── */}
          <div className="balance-card">
            <div className="balance-left">
              <span className="balance-label">Available Balance</span>
              <span className="balance-amount">
                ₹{((walletData.walletBalance ?? walletData.balance) || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2, maximumFractionDigits: 2
                })}
              </span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowWithdraw(!showWithdraw);
                setWithdrawError('');
                setWithdrawSuccess('');
              }}
            >
              💸 Withdraw
            </button>
          </div>

          {/* ── Withdraw Panel ── */}
          {showWithdraw && (
            <div className="withdraw-panel">
              <h3 className="withdraw-title">Withdraw Funds</h3>
              {withdrawError && <div className="alert alert-error">{withdrawError}</div>}
              {withdrawSuccess && <div className="alert alert-success">{withdrawSuccess}</div>}
              <form onSubmit={handleWithdraw} className="withdraw-form">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    min={1}
                    max={walletData.balance}
                    required
                  />
                  <span className="field-hint">
                    Available: ₹{(walletData.balance ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowWithdraw(false)}
                    disabled={withdrawLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={withdrawLoading}
                  >
                    {withdrawLoading ? <span className="spinner-sm"></span> : 'Confirm Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {withdrawSuccess && !showWithdraw && (
            <div className="alert alert-success">{withdrawSuccess}</div>
          )}

          {/* ── Transaction History ── */}
          <div className="section">
            <h2 className="section-title">Transaction History</h2>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <h3>No transactions yet</h3>
                <p>Your transaction history will appear here.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Task</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => (
                      <tr key={tx._id || idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="tx-date">{formatDate(tx.createdAt)}</td>
                        <td>
                          <span className={`status-badge ${txTypeBadge[tx.type] || ''}`}>
                            {txTypeLabels[tx.type] || tx.type}
                          </span>
                        </td>
                        <td className={`tx-amount ${
                          tx.type === 'PAYMENT_RELEASE' || tx.type === 'REFUND'
                            ? 'text-success'
                            : tx.type === 'WITHDRAWAL'
                            ? 'text-danger'
                            : 'text-warning'
                        }`}>
                          {tx.type === 'ESCROW_LOCK' || tx.type === 'WITHDRAWAL' ? '−' : '+'}
                          ₹{(tx.amount ?? 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="tx-task">
                          {tx.task?.title ? (
                            <span title={tx.task.title}>
                              {tx.task.title.length > 30
                                ? `${tx.task.title.slice(0, 30)}...`
                                : tx.task.title}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="tx-note text-muted">
                          {tx.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Wallet;
