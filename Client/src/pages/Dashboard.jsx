import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusColors = {
  OPEN: 'badge-open',
  IN_PROGRESS: 'badge-in-progress',
  UNDER_REVIEW: 'badge-under-review',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
  REFUNDED: 'badge-refunded',
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.get('/tasks/my')
      .then((res) => {
        if (active) {
          setTasks(res.data.tasks || res.data || []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load tasks.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const isClient = user?.role === 'client';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isClient ? 'My Posted Tasks' : 'My Active Tasks'}
          </h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.fullName}</strong>
          </p>
        </div>
        {isClient && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/tasks/new')}
          >
            + Post New Task
          </button>
        )}
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-error">{error}</div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>{isClient ? 'No tasks posted yet' : 'No active tasks yet'}</h3>
          <p>
            {isClient
              ? 'Start by posting a task to get bids from freelancers.'
              : 'Browse open tasks and submit bids to get started.'}
          </p>
          {isClient ? (
            <button className="btn btn-primary" onClick={() => navigate('/tasks/new')}>
              Post Your First Task
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
              Browse Tasks
            </button>
          )}
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="task-grid">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="task-card"
              onClick={() => navigate(`/tasks/${task._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${task._id}`)}
            >
              <div className="task-card-header">
                <h3 className="task-card-title">{task.title}</h3>
                <span className={`status-badge ${statusColors[task.status] || ''}`}>
                  {task.status?.replace('_', ' ')}
                </span>
              </div>

              <p className="task-card-desc">
                {task.description?.length > 100
                  ? `${task.description.slice(0, 100)}...`
                  : task.description}
              </p>

              <div className="task-card-meta">
                <span className="meta-item">
                  <span className="meta-icon">💰</span> ₹{task.budget?.toLocaleString('en-IN')}
                </span>
                <span className="meta-item">
                  <span className="meta-icon">📅</span> {formatDate(task.deadline)}
                </span>
              </div>

              {!isClient && task.client && (
                <div className="task-card-client">
                  Posted by <strong>{task.client.fullName}</strong>
                </div>
              )}

              <div className="task-card-footer">
                <Link
                  to={`/tasks/${task._id}`}
                  className="btn btn-outline btn-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
