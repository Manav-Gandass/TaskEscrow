import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TaskList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect clients
    if (user && user.role === 'client') {
      navigate('/dashboard', { replace: true });
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    api.get('/tasks')
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
  }, [user, navigate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const truncate = (str, max = 100) => {
    if (!str) return '';
    return str.length > max ? `${str.slice(0, max)}...` : str;
  };

  if (user?.role === 'client') return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Browse Open Tasks</h1>
          <p className="page-subtitle">Find work that matches your skills</p>
        </div>
        <span className="results-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''} available</span>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading available tasks...</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-error">{error}</div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No open tasks right now</h3>
          <p>Check back soon — new tasks are posted regularly.</p>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="task-grid">
          {tasks.map((task) => (
            <div key={task._id} className="task-card task-card-browse">
              <div className="task-card-header">
                <h3 className="task-card-title">{task.title}</h3>
                <span className="status-badge badge-open">OPEN</span>
              </div>

              <p className="task-card-desc">{truncate(task.description)}</p>

              <div className="task-card-meta">
                <span className="meta-item">
                  <span className="meta-icon">💰</span>
                  <strong>₹{task.budget?.toLocaleString('en-IN')}</strong>
                </span>
                <span className="meta-item">
                  <span className="meta-icon">📅</span> {formatDate(task.deadline)}
                </span>
              </div>

              {task.client && (
                <div className="task-card-client">
                  <span className="meta-icon">👤</span> {task.client.fullName}
                </div>
              )}

              <div className="task-card-footer">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/tasks/${task._id}`)}
                >
                  View &amp; Bid →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
