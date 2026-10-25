import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/* ─────────────── Razorpay Script Loader ─────────────── */
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/* ─────────────── Status Badge ─────────────── */
const statusColors = {
  OPEN: 'badge-open',
  IN_PROGRESS: 'badge-in-progress',
  UNDER_REVIEW: 'badge-under-review',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
  REFUNDED: 'badge-refunded',
};

const StatusBadge = ({ status }) => (
  <span className={`status-badge ${statusColors[status] || ''}`}>
    {status?.replace(/_/g, ' ')}
  </span>
);

/* ─────────────── Main Component ─────────────── */
const TaskDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [bids, setBids] = useState([]);
  const [serverMyBid, setServerMyBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Bid form state
  const [pitch, setPitch] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);

  // Deliverable form state
  const [deliverable, setDeliverable] = useState('');
  const [deliverableNote, setDeliverableNote] = useState('');
  const [deliverableLoading, setDeliverableLoading] = useState(false);
  const [deliverableError, setDeliverableError] = useState('');

  const fetchTask = useCallback(async () => {
    let active = true;
    try {
      const res = await api.get(`/tasks/${id}`);
      if (active) {
        setTask(res.data.task || res.data);
        if (res.data.myBid) setServerMyBid(res.data.myBid);
      }
    } catch (err) {
      if (active) setError(err.response?.data?.message || 'Failed to load task.');
    }
    return () => { active = false; };
  }, [id]);

  const fetchBids = useCallback(async () => {
    let active = true;
    try {
      const res = await api.get(`/bids/${id}`);
      if (active) setBids(res.data.bids || res.data || []);
    } catch {
      // bids may not be accessible; silently ignore
    }
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        const [taskRes] = await Promise.all([api.get(`/tasks/${id}`)]);
        if (!active) return;
        const taskData = taskRes.data.task || taskRes.data;
        setTask(taskData);
        if (taskRes.data.myBid) setServerMyBid(taskRes.data.myBid);

        // Fetch bids if user is the client and task is OPEN
        if (
          user?.role === 'client' &&
          (taskData.status === 'OPEN' || taskData.status === 'IN_PROGRESS')
        ) {
          try {
            const bidsRes = await api.get(`/bids/${id}`);
            if (active) setBids(bidsRes.data.bids || bidsRes.data || []);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load task.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [id, user]);

  const refreshAll = async () => {
    setLoading(true);
    await fetchTask();
    if (user?.role === 'client') await fetchBids();
    setLoading(false);
  };

  /* ─── Check if freelancer has bid ─── */
  const myBid =
    serverMyBid ||
    bids.find((b) => b.freelancer?._id === user?._id || b.freelancer === user?._id);
  const hasMyBid =
    task?.status === 'OPEN' &&
    user?.role === 'freelancer' &&
    (myBid !== undefined && myBid !== null || bidSuccess);

  /* ─── Bid submission ─── */
  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidError('');
    if (!pitch.trim()) { setBidError('Pitch is required.'); return; }
    setBidLoading(true);
    try {
      await api.post(`/bids/${id}`, { pitch, portfolioLink });
      setBidSuccess(true);
      setPitch('');
      setPortfolioLink('');
      await refreshAll();
    } catch (err) {
      setBidError(err.response?.data?.message || 'Failed to submit bid.');
    } finally {
      setBidLoading(false);
    }
  };

  /* ─── Accept Bid + Razorpay ─── */
  const handleAcceptBid = async (bidId) => {
    setActionError('');
    setActionMsg('');
    setActionLoading(bidId);
    try {
      const res = await api.post(`/bids/${bidId}/accept`);
      const { razorpayOrderId, amount, keyId, taskId, bidId: rBidId } = res.data;

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setActionError('Failed to load Razorpay. Please try again.');
        setActionLoading('');
        return;
      }

      const options = {
        key: keyId,
        amount: amount, // amount is already in paise from the backend order
        currency: 'INR',
        name: 'TaskEscrow',
        description: `Payment for task: ${task.title}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              taskId,
              bidId: rBidId,
            });
            setActionMsg('✅ Payment successful! Task is now in progress.');
            await refreshAll();
          } catch (verifyErr) {
            setActionError(
              verifyErr.response?.data?.message || 'Payment verification failed.'
            );
          }
        },
        prefill: { name: user?.fullName, email: user?.email },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: () => {
            setActionError('Payment cancelled.');
            setActionLoading('');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setActionError(`Payment failed: ${response.error.description}`);
        setActionLoading('');
      });
      rzp.open();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to accept bid.');
    } finally {
      setActionLoading('');
    }
  };

  /* ─── Reject Bid ─── */
  const handleRejectBid = async (bidId) => {
    setActionError('');
    setActionLoading(bidId + '_reject');
    try {
      await api.post(`/bids/${bidId}/reject`);
      setBids((prev) => prev.filter((b) => b._id !== bidId));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject bid.');
    } finally {
      setActionLoading('');
    }
  };

  /* ─── Approve & Release Payment ─── */
  const handleApproveWork = async () => {
    setActionError('');
    setActionMsg('');
    setActionLoading('approve');
    try {
      await api.post(`/delivery/${id}/approve`);
      setActionMsg('🎉 Work approved and payment released!');
      await refreshAll();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve work.');
    } finally {
      setActionLoading('');
    }
  };

  /* ─── Request Revision ─── */
  const handleRequestRevision = async () => {
    setActionError('');
    setActionMsg('');
    setActionLoading('revision');
    try {
      await api.post(`/delivery/${id}/revision`);
      setActionMsg('🔄 Revision requested. Freelancer has been notified.');
      await refreshAll();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to request revision.');
    } finally {
      setActionLoading('');
    }
  };

  /* ─── Refund (Deadline Passed) ─── */
  const handleRefund = async () => {
    setActionError('');
    setActionMsg('');
    setActionLoading('refund');
    try {
      await api.post(`/delivery/${id}/refund`);
      setActionMsg('💰 Refund initiated. Funds returned to your wallet.');
      await refreshAll();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to initiate refund.');
    } finally {
      setActionLoading('');
    }
  };

  /* ─── Submit Deliverable ─── */
  const handleDeliverableSubmit = async (e) => {
    e.preventDefault();
    setDeliverableError('');
    if (!deliverable.trim()) { setDeliverableError('Deliverable link is required.'); return; }
    setDeliverableLoading(true);
    try {
      await api.post(`/delivery/${id}/submit`, { deliverable, deliverableNote });
      setActionMsg('✅ Work submitted! Awaiting client review.');
      await refreshAll();
    } catch (err) {
      setDeliverableError(err.response?.data?.message || 'Failed to submit work.');
    } finally {
      setDeliverableLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const isDeadlinePassed = task?.deadline && new Date(task.deadline) < new Date();
  const isClientOwner = user?.role === 'client' && task?.client?._id === user?._id;
  const isAssignedFreelancer =
    user?.role === 'freelancer' &&
    task?.freelancer &&
    (task.freelancer._id === user?._id || task.freelancer === user?._id);

  /* ────────────────── RENDER ────────────────── */

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="page-container page-narrow">
      {/* ── Task Header ── */}
      <div className="task-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <StatusBadge status={task.status} />
      </div>

      <div className="task-detail-card">
        <h1 className="task-detail-title">{task.title}</h1>
        <p className="task-detail-desc">{task.description}</p>

        <div className="task-detail-meta">
          <div className="meta-row">
            <span className="meta-label">💰 Budget</span>
            <span className="meta-value">₹{task.budget?.toLocaleString('en-IN')}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">📅 Deadline</span>
            <span className={`meta-value ${isDeadlinePassed ? 'text-danger' : ''}`}>
              {formatDate(task.deadline)}
              {isDeadlinePassed && ' (Passed)'}
            </span>
          </div>
          {task.client && (
            <div className="meta-row">
              <span className="meta-label">👤 Client</span>
              <span className="meta-value">{task.client.fullName}</span>
            </div>
          )}
          {task.freelancer && (
            <div className="meta-row">
              <span className="meta-label">🛠 Freelancer</span>
              <span className="meta-value">
                {task.freelancer.fullName || task.freelancer}
              </span>
            </div>
          )}
          {task.deliverableLink && (
            <div className="meta-row">
              <span className="meta-label">📎 Deliverable</span>
              <a
                href={task.deliverableLink}
                target="_blank"
                rel="noopener noreferrer"
                className="meta-value auth-link"
              >
                View Submission ↗
              </a>
            </div>
          )}
          {task.deliverableNote && (
            <div className="meta-row">
              <span className="meta-label">📝 Note</span>
              <span className="meta-value">{task.deliverableNote}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Action Messages ── */}
      {actionMsg && <div className="alert alert-success">{actionMsg}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {/* ══════════════════════════════════════
          CLIENT VIEWS
         ══════════════════════════════════════ */}
      {isClientOwner && (
        <>
          {/* ── OPEN: Show Bids ── */}
          {task.status === 'OPEN' && (
            <div className="section">
              <h2 className="section-title">
                Bids ({bids.length})
              </h2>
              {bids.length === 0 ? (
                <div className="empty-state-sm">
                  <p>No bids yet. Share your task link to attract freelancers!</p>
                </div>
              ) : (
                <div className="bids-list">
                  {bids.map((bid) => (
                    <div key={bid._id} className="bid-card">
                      <div className="bid-card-header">
                        <div>
                          <span className="bid-freelancer">
                            {bid.freelancer?.fullName || 'Freelancer'}
                          </span>
                          {bid.freelancer?.email && (
                            <span className="bid-email"> · {bid.freelancer.email}</span>
                          )}
                        </div>
                        <div className="bid-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAcceptBid(bid._id)}
                            disabled={actionLoading === bid._id}
                          >
                            {actionLoading === bid._id
                              ? <span className="spinner-sm"></span>
                              : '✓ Accept & Pay'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectBid(bid._id)}
                            disabled={actionLoading === bid._id + '_reject'}
                          >
                            {actionLoading === bid._id + '_reject'
                              ? <span className="spinner-sm"></span>
                              : '✗ Reject'}
                          </button>
                        </div>
                      </div>
                      <p className="bid-pitch">{bid.pitch}</p>
                      {bid.portfolioLink && (
                        <a
                          href={bid.portfolioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bid-portfolio"
                        >
                          🔗 Portfolio / Sample Work ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── IN_PROGRESS ── */}
          {task.status === 'IN_PROGRESS' && (
            <div className="section">
              <h2 className="section-title">Task In Progress</h2>
              <div className="info-box">
                <p>
                  <strong>{task.freelancer?.fullName || 'The freelancer'}</strong> is
                  currently working on this task.
                </p>
                <p className="text-muted">
                  Deadline: {formatDate(task.deadline)}
                  {isDeadlinePassed && (
                    <span className="text-danger"> — Deadline has passed.</span>
                  )}
                </p>
              </div>
              <div className="action-row">
                {!isDeadlinePassed && (
                  <button
                    className="btn btn-warning"
                    onClick={handleRequestRevision}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'revision'
                      ? <span className="spinner-sm"></span>
                      : '🔄 Request Revision'}
                  </button>
                )}
                {isDeadlinePassed && (
                  <button
                    className="btn btn-danger"
                    onClick={handleRefund}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'refund'
                      ? <span className="spinner-sm"></span>
                      : '💰 Refund (Deadline Passed)'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── UNDER_REVIEW ── */}
          {task.status === 'UNDER_REVIEW' && (
            <div className="section">
              <h2 className="section-title">Work Submitted — Under Review</h2>
              <div className="info-box">
                {task.deliverableLink && (
                  <p>
                    <strong>Deliverable:</strong>{' '}
                    <a
                      href={task.deliverableLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="auth-link"
                    >
                      View submitted work ↗
                    </a>
                  </p>
                )}
                {task.deliverableNote && (
                  <p><strong>Note from freelancer:</strong> {task.deliverableNote}</p>
                )}
              </div>
              <div className="action-row">
                <button
                  className="btn btn-success"
                  onClick={handleApproveWork}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'approve'
                    ? <span className="spinner-sm"></span>
                    : '✅ Approve & Release Payment'}
                </button>
                <button
                  className="btn btn-warning"
                  onClick={handleRequestRevision}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'revision'
                    ? <span className="spinner-sm"></span>
                    : '🔄 Request Revision'}
                </button>
              </div>
            </div>
          )}

          {/* ── COMPLETED ── */}
          {task.status === 'COMPLETED' && (
            <div className="section">
              <div className="receipt-card">
                <div className="receipt-icon">🎉</div>
                <h2 className="receipt-title">Task Completed!</h2>
                <div className="receipt-details">
                  <div className="receipt-row">
                    <span>Freelancer</span>
                    <strong>{task.freelancer?.fullName || '—'}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Amount Released</span>
                    <strong className="text-success">₹{task.budget?.toLocaleString('en-IN')}</strong>
                  </div>
                  {task.deliverableLink && (
                    <div className="receipt-row">
                      <span>Deliverable</span>
                      <a
                        href={task.deliverableLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="auth-link"
                      >
                        View ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CANCELLED / REFUNDED ── */}
          {(task.status === 'CANCELLED' || task.status === 'REFUNDED') && (
            <div className="section">
              <div className="info-box info-box-warning">
                <h3>Task {task.status === 'CANCELLED' ? 'Cancelled' : 'Refunded'}</h3>
                <p>
                  {task.status === 'REFUNDED'
                    ? 'The funds have been returned to your wallet.'
                    : 'This task has been cancelled.'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          FREELANCER VIEWS
         ══════════════════════════════════════ */}
      {user?.role === 'freelancer' && (
        <>
          {/* ── OPEN: Submit Bid or Show Existing ── */}
          {task.status === 'OPEN' && (
            <div className="section">
              {hasMyBid ? (
                <div className="info-box">
                  <h3>✅ Bid Submitted</h3>
                  <p>Awaiting the client&apos;s decision. We&apos;ll update you soon!</p>
                </div>
              ) : (
                <>
                  <h2 className="section-title">Submit Your Bid</h2>
                  {bidError && <div className="alert alert-error">{bidError}</div>}
                  <form onSubmit={handleBidSubmit} className="bid-form">
                    <div className="form-group">
                      <label className="form-label">Your Pitch</label>
                      <textarea
                        className="form-input form-textarea"
                        value={pitch}
                        onChange={(e) => setPitch(e.target.value)}
                        placeholder="Explain why you're the best person for this task, your approach, timeline, etc."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Portfolio / Sample Work Link{' '}
                        <span className="optional-label">(optional)</span>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={portfolioLink}
                        onChange={(e) => setPortfolioLink(e.target.value)}
                        placeholder="https://your-portfolio.com"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={bidLoading}
                    >
                      {bidLoading ? <span className="spinner-sm"></span> : 'Submit Bid'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ── IN_PROGRESS: Submit Deliverable ── */}
          {task.status === 'IN_PROGRESS' && isAssignedFreelancer && (
            <div className="section">
              <h2 className="section-title">Submit Your Work</h2>
              {deliverableError && <div className="alert alert-error">{deliverableError}</div>}
              <form onSubmit={handleDeliverableSubmit} className="bid-form">
                <div className="form-group">
                  <label className="form-label">Deliverable URL</label>
                  <input
                    type="url"
                    className="form-input"
                    value={deliverable}
                    onChange={(e) => setDeliverable(e.target.value)}
                    placeholder="https://drive.google.com/... or GitHub link"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Note to Client{' '}
                    <span className="optional-label">(optional)</span>
                  </label>
                  <textarea
                    className="form-input form-textarea"
                    value={deliverableNote}
                    onChange={(e) => setDeliverableNote(e.target.value)}
                    placeholder="Describe what you've done, any notes or instructions..."
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={deliverableLoading}
                >
                  {deliverableLoading
                    ? <span className="spinner-sm"></span>
                    : 'Submit Work'}
                </button>
              </form>
            </div>
          )}

          {/* IN_PROGRESS but not assigned to me */}
          {task.status === 'IN_PROGRESS' && !isAssignedFreelancer && (
            <div className="info-box info-box-warning">
              <p>This task has been assigned to another freelancer.</p>
            </div>
          )}

          {/* ── UNDER_REVIEW ── */}
          {task.status === 'UNDER_REVIEW' && isAssignedFreelancer && (
            <div className="info-box">
              <h3>🕐 Work Submitted</h3>
              <p>Your work is currently under review by the client. Hang tight!</p>
            </div>
          )}

          {/* ── COMPLETED ── */}
          {task.status === 'COMPLETED' && isAssignedFreelancer && (
            <div className="section">
              <div className="receipt-card">
                <div className="receipt-icon">🎉</div>
                <h2 className="receipt-title">Work Approved!</h2>
                <p className="receipt-subtitle">
                  Payment of{' '}
                  <span className="text-success">
                    ₹{task.budget?.toLocaleString('en-IN')}
                  </span>{' '}
                  has been released to your wallet.
                </p>
              </div>
            </div>
          )}

          {/* ── CANCELLED / REFUNDED ── */}
          {(task.status === 'CANCELLED' || task.status === 'REFUNDED') && (
            <div className="info-box info-box-warning">
              <h3>Task {task.status === 'CANCELLED' ? 'Cancelled' : 'Refunded'}</h3>
              <p>This task is no longer active.</p>
            </div>
          )}
        </>
      )}

      {/* ── Non-owner, non-assigned views ── */}
      {!isClientOwner && user?.role === 'client' && (
        <div className="info-box info-box-warning">
          <p>You are viewing a task posted by another client.</p>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
