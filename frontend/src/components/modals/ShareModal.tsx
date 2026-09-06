import React, { useState } from 'react';
import {
  X,
  Share2,
  Link,
  Copy,
  Check,
  Shield,
  Clock,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { FileItem } from '../../types/drive';
import { useDrive } from '../../context/DriveContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, file }) => {
  const {
    addShare,
    removeShare,
    getFileShares,
    createLinkShare,
    removeLinkShare,
    getFileLinkShare,
  } = useDrive();

  const [activeTab, setActiveTab] = useState<'users' | 'link'>('users');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [password, setPassword] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !file) return null;

  const currentShares = getFileShares(file.id);
  const currentLinkShare = getFileLinkShare(file.id);

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      addShare(file.id, email, role);
      setEmail('');
    }
  };

  const handleToggleLinkShare = () => {
    if (currentLinkShare) {
      removeLinkShare(currentLinkShare.id);
    } else {
      const expiresAt = new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString();
      createLinkShare(file.id, {
        expires_at: expiresAt,
        password: password.trim() ? password : undefined,
      });
    }
  };

  const handleCopyLink = () => {
    if (!currentLinkShare) return;
    const url = `${window.location.origin}/s/${currentLinkShare.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Share2 size={20} />
            <div>
              <h3>Share "{file.name}"</h3>
              <p className="modal-subtitle">Manage user permissions and public links</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Share Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UserPlus size={16} />
            <span>Collaborators ({currentShares.length})</span>
          </button>
          <button
            className={`modal-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Link size={16} />
            <span>Public Link {currentLinkShare && '• Active'}</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'users' ? (
            <div className="share-users-tab">
              <form onSubmit={handleAddCollaborator} className="share-input-row">
                <input
                  type="email"
                  className="text-input"
                  placeholder="Invite by email (e.g. colleague@work.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <select
                  className="select-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={!email.trim()}>
                  Invite
                </button>
              </form>

              <div className="collaborators-list">
                <h4 className="section-subtitle">People with access</h4>
                <div className="collaborator-item owner-item">
                  <div className="user-avatar-sm">O</div>
                  <div className="user-details">
                    <span className="user-name">You</span>
                    <span className="user-badge">Owner</span>
                  </div>
                </div>

                {currentShares.map((share) => (
                  <div className="collaborator-item" key={share.id}>
                    <div className="user-avatar-sm">
                      {share.shared_with_email.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <span className="user-email">{share.shared_with_email}</span>
                      <span className="role-tag">{share.role}</span>
                    </div>
                    <button
                      className="icon-btn danger-hover"
                      title="Revoke access"
                      onClick={() => removeShare(share.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {currentShares.length === 0 && (
                  <p className="empty-hint">No other collaborators invited yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="share-link-tab">
              <div className="link-status-card">
                <div className="link-status-header">
                  <div>
                    <h4 className="card-title">Public Sharing Link</h4>
                    <p className="card-desc">
                      {currentLinkShare
                        ? 'Anyone with this token link can view or download this file.'
                        : 'Generate a secure public token link for non-registered users.'}
                    </p>
                  </div>
                  <button
                    className={`btn ${currentLinkShare ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleToggleLinkShare}
                  >
                    {currentLinkShare ? 'Disable Link' : 'Generate Link'}
                  </button>
                </div>

                {currentLinkShare && (
                  <div className="link-details-group">
                    <div className="link-copy-row">
                      <input
                        type="text"
                        readOnly
                        className="text-input font-mono"
                        value={`${window.location.origin}/s/${currentLinkShare.token}`}
                      />
                      <button className="btn btn-primary" onClick={handleCopyLink}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="link-meta-grid">
                      <div className="meta-pill">
                        <Clock size={14} />
                        <span>
                          Expires:{' '}
                          {currentLinkShare.expires_at
                            ? new Date(currentLinkShare.expires_at).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>
                      {currentLinkShare.has_password && (
                        <div className="meta-pill">
                          <Shield size={14} />
                          <span>Password Protected</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!currentLinkShare && (
                  <div className="link-options-form">
                    <div className="form-group">
                      <label className="input-label">Link Expiration</label>
                      <select
                        className="select-input full-width"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(e.target.value)}
                      >
                        <option value="1">Expires in 1 day</option>
                        <option value="7">Expires in 7 days</option>
                        <option value="30">Expires in 30 days</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="input-label">Optional Password Protection</label>
                      <input
                        type="password"
                        className="text-input full-width"
                        placeholder="Leave blank for no password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
