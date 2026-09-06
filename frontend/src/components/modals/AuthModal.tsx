import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  LogIn,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'switch';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const { currentUser, users, login, register, switchUser, logout, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'switch'>(initialTab);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.success) {
      setPassword('');
      setError('');
      onClose();
    } else {
      setError(res.error || 'Invalid email or password');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    const res = await register(name.trim(), email.trim(), password);
    setLoading(false);
    if (res.success) {
      setName('');
      setEmail('');
      setPassword('');
      setError('');
      onClose();
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="auth-header-icon-box">
              <UserIcon size={20} />
            </div>
            <div>
              <h3>Authentication</h3>
              <p className="modal-subtitle">
                {tab === 'login'
                  ? 'Sign in to access your media files'
                  : tab === 'register'
                  ? 'Create a new secure storage account'
                  : 'Manage active sessions & test collaboration'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError('');
            }}
          >
            <LogIn size={15} />
            <span>Log In</span>
          </button>
          <button
            className={`modal-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError('');
            }}
          >
            <UserPlus size={15} />
            <span>Sign Up</span>
          </button>
          <button
            className={`modal-tab ${tab === 'switch' ? 'active' : ''}`}
            onClick={() => {
              setTab('switch');
              setError('');
            }}
          >
            <UserCheck size={15} />
            <span>Switch User</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {error && <div className="form-error-banner">{error}</div>}

          {/* TAB 1: LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  className="text-input full-width"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <div className="input-label-row">
                  <label className="input-label">Password</label>
                </div>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="text-input full-width with-action-btn"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Quick Demo Accounts Helper */}
              <div className="quick-accounts-section">
                <span className="quick-accounts-label">
                  <Sparkles size={13} /> Quick Fill Demo Accounts:
                </span>
                <div className="quick-accounts-chips">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => handleQuickFill('prajwal@cloudstorage.io')}
                  >
                    Prajwal (Owner)
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => handleQuickFill('sarah.chen@techcorp.com')}
                  >
                    Sarah Chen (Editor)
                  </button>
                </div>
              </div>

              <div className="security-note">
                <ShieldCheck size={14} />
                <span>Protected by bcrypt hashing & JWT tokens.</span>
              </div>

              <div className="modal-footer no-padding-bottom">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <LogIn size={15} />
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                </button>
              </div>

              <div className="auth-footer-switch">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setTab('register');
                    setError('');
                  }}
                >
                  Create one now
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  className="text-input full-width"
                  placeholder="e.g., Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  className="text-input full-width"
                  placeholder="jane.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Password (min. 6 characters)</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="text-input full-width with-action-btn"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="input-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="security-note">
                <Lock size={14} />
                <span>Password is securely hashed with bcrypt before storage.</span>
              </div>

              <div className="modal-footer no-padding-bottom">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <UserPlus size={15} />
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                </button>
              </div>

              <div className="auth-footer-switch">
                <span>Already registered?</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setTab('login');
                    setError('');
                  }}
                >
                  Log In
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SWITCH USER / COLLABORATION */}
          {tab === 'switch' && (
            <div className="account-switch-list">
              <p className="input-label">
                Select an account to view its personal files, shared permissions, and drive quota:
              </p>

              <div className="accounts-scroll-box">
                {users.map((u) => {
                  const isActive = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      className={`account-card ${isActive ? 'active' : ''}`}
                      onClick={async () => {
                        await switchUser(u.id);
                        onClose();
                      }}
                    >
                      <div className="user-avatar-md">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="account-info">
                        <div className="account-name-row">
                          <strong>{u.name}</strong>
                          {isActive && <span className="active-pill">Active</span>}
                        </div>
                        <span className="account-email">{u.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="switch-modal-bottom-actions">
                {isAuthenticated && (
                  <button
                    type="button"
                    className="btn btn-secondary danger-text full-width"
                    onClick={() => {
                      logout();
                      setTab('login');
                    }}
                  >
                    <LogOut size={15} />
                    <span>Log Out of Current Session</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
