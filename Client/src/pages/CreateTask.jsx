import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'freelancer') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (!formData.budget || Number(formData.budget) < 1)
      newErrors.budget = 'Budget must be at least ₹1.';
    if (!formData.deadline) newErrors.deadline = 'Deadline is required.';
    else if (formData.deadline < today)
      newErrors.deadline = 'Deadline must be today or later.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post('/tasks', {
        ...formData,
        budget: Number(formData.budget),
      });
      navigate('/dashboard');
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Failed to create task. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'freelancer') return null;

  return (
    <div className="page-container page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">Post a New Task</h1>
          <p className="page-subtitle">Describe what you need done and set your budget</p>
        </div>
      </div>

      <div className="form-card">
        {serverError && (
          <div className="alert alert-error">{serverError}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title" className="form-label">Task Title</label>
            <input
              id="title"
              name="title"
              type="text"
              className={`form-input ${errors.title ? 'input-error' : ''}`}
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Design a logo for my startup"
              maxLength={120}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              className={`form-input form-textarea ${errors.description ? 'input-error' : ''}`}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the task in detail — requirements, deliverables, style preferences, etc."
              rows={5}
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group form-group-half">
              <label htmlFor="budget" className="form-label">Budget (₹)</label>
              <input
                id="budget"
                name="budget"
                type="number"
                className={`form-input ${errors.budget ? 'input-error' : ''}`}
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g. 500"
                min={1}
              />
              {errors.budget && <span className="field-error">{errors.budget}</span>}
            </div>

            <div className="form-group form-group-half">
              <label htmlFor="deadline" className="form-label">Deadline</label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                className={`form-input ${errors.deadline ? 'input-error' : ''}`}
                value={formData.deadline}
                onChange={handleChange}
                min={today}
              />
              {errors.deadline && <span className="field-error">{errors.deadline}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <span className="spinner-sm"></span> : 'Post Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
