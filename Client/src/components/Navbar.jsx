import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'client') return 'badge badge-client';
    if (role === 'freelancer') return 'badge badge-freelancer';
    return 'badge';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" className="navbar-logo">
          <span className="logo-icon">⚡</span> TaskEscrow
        </Link>
      </div>

      <div className="navbar-links">
        <Link
          to="/dashboard"
          className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        {user?.role === 'freelancer' && (
          <Link
            to="/tasks"
            className={`nav-link ${location.pathname === '/tasks' ? 'active' : ''}`}
          >
            Browse Tasks
          </Link>
        )}
        {user?.role === 'client' && (
          <Link
            to="/tasks/new"
            className={`nav-link ${location.pathname === '/tasks/new' ? 'active' : ''}`}
          >
            Post Task
          </Link>
        )}
        <Link
          to="/wallet"
          className={`nav-link ${location.pathname === '/wallet' ? 'active' : ''}`}
        >
          Wallet
        </Link>
      </div>

      <div className="navbar-user">
        {user && (
          <>
            <div className="user-info">
              <span className="user-name">{user.fullName}</span>
              <span className={getRoleBadgeClass(user.role)}>
                {user.role}
              </span>
            </div>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
