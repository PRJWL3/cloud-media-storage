import React, { useState, useRef, useEffect } from 'react';
import {
  HardDrive,
  Share2,
  Star,
  Trash2,
  Plus,
  FolderPlus,
  UploadCloud,
  Layers,
  Users,
} from 'lucide-react';
import { useDrive } from '../context/DriveContext';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../utils/formatters';
import type { DriveView } from '../types/drive';

interface SidebarProps {
  onOpenCreateFolder: () => void;
  onTriggerUpload: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCreateFolder,
  onTriggerUpload,
  onOpenAuth,
}) => {
  const {
    currentView,
    setCurrentView,
    storageUsedBytes,
    folders,
    files,
    shares,
  } = useDrive();
  const { currentUser } = useAuth();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
    };
    if (isNewMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNewMenuOpen]);

  // Counts for badges
  const myDriveCount =
    folders.filter((f) => f.deleted_at === null && f.owner_id === currentUser.id).length +
    files.filter((f) => f.deleted_at === null && f.owner_id === currentUser.id).length;

  const sharedCount = shares.filter(
    (s) =>
      s.shared_with_email.toLowerCase() === currentUser.email.toLowerCase() ||
      s.shared_with_user_id === currentUser.id
  ).length;

  const starredCount = files.filter((f) => f.deleted_at === null && f.starred).length;

  const trashCount =
    folders.filter((f) => f.deleted_at !== null && f.owner_id === currentUser.id).length +
    files.filter((f) => f.deleted_at !== null && f.owner_id === currentUser.id).length;

  const TOTAL_STORAGE = 5 * 1024 * 1024 * 1024; // 5 GB
  const storagePercentage = Math.min(100, Math.round((storageUsedBytes / TOTAL_STORAGE) * 100));

  const navItems: { view: DriveView; label: string; icon: React.ReactNode; count: number }[] = [
    { view: 'my-drive', label: 'My Drive', icon: <HardDrive size={18} />, count: myDriveCount },
    { view: 'shared', label: 'Shared with me', icon: <Share2 size={18} />, count: sharedCount },
    { view: 'starred', label: 'Starred', icon: <Star size={18} />, count: starredCount },
    { view: 'trash', label: 'Trash', icon: <Trash2 size={18} />, count: trashCount },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-logo-box">
          <Layers size={22} />
        </div>
        <div className="brand-text">
          <h2 className="brand-title">CLOUD DRIVE</h2>
          <span className="brand-subtitle">Media Storage</span>
        </div>
      </div>

      {/* New Action Button */}
      <div className="new-button-wrapper" ref={newMenuRef}>
        <button
          className="btn-new-item"
          onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
        >
          <Plus size={18} />
          <span>New</span>
        </button>

        {isNewMenuOpen && (
          <div className="new-dropdown-menu">
            <button
              className="dropdown-item"
              onClick={() => {
                setIsNewMenuOpen(false);
                onOpenCreateFolder();
              }}
            >
              <FolderPlus size={16} />
              <span>New Folder</span>
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                setIsNewMenuOpen(false);
                onTriggerUpload();
              }}
            >
              <UploadCloud size={16} />
              <span>Upload Files</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentView(item.view)}
            >
              <div className="nav-item-icon">{item.icon}</div>
              <span className="nav-item-label">{item.label}</span>
              {item.count > 0 && <span className="nav-item-badge">{item.count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Storage & User Footer */}
      <div className="sidebar-footer">
        <div className="storage-card">
          <div className="storage-header">
            <span>Storage</span>
            <span>{storagePercentage}%</span>
          </div>
          <div className="storage-progress-track">
            <div
              className="storage-progress-fill"
              style={{ width: `${Math.max(4, storagePercentage)}%` }}
            />
          </div>
          <p className="storage-text">
            {formatBytes(storageUsedBytes)} of 5 GB used
          </p>
        </div>

        <div className="user-profile-widget" onClick={onOpenAuth}>
          <div className="user-avatar-sm">{currentUser.name.charAt(0).toUpperCase()}</div>
          <div className="user-profile-info">
            <span className="user-profile-name">{currentUser.name}</span>
            <span className="user-profile-sub">
              <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
              Switch Account
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
