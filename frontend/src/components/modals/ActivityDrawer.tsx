import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { ActivityItem } from '../../types/drive';
import { X, RefreshCw, Clock, Activity as ActivityIcon, Upload, Trash2, Share2, FolderPlus, Edit3, RotateCcw, Link, FileText } from 'lucide-react';
import { formatRelativeDate } from '../../utils/formatters';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getActivities();
      setActivities(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    apiClient.getActivities()
      .then((data) => {
        if (isMounted) setActivities(data);
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load activity logs');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'upload':
      case 'version_create':
        return <Upload size={14} style={{ color: '#38bdf8' }} />;
      case 'delete':
      case 'permanent_delete':
      case 'delete_folder':
      case 'permanent_delete_folder':
        return <Trash2 size={14} style={{ color: '#f87171' }} />;
      case 'restore':
      case 'restore_folder':
      case 'version_restore':
        return <RotateCcw size={14} style={{ color: '#4ade80' }} />;
      case 'share':
      case 'unshare':
        return <Share2 size={14} style={{ color: '#a78bfa' }} />;
      case 'link_share':
        return <Link size={14} style={{ color: '#facc15' }} />;
      case 'create_folder':
        return <FolderPlus size={14} style={{ color: '#38bdf8' }} />;
      case 'rename':
      case 'update_folder':
      case 'rename/update':
        return <Edit3 size={14} style={{ color: '#fb923c' }} />;
      default:
        return <FileText size={14} style={{ color: '#a1a1aa' }} />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Slide-over Panel */}
      <div
        style={{
          position: 'relative',
          width: '420px',
          maxWidth: '100vw',
          height: '100%',
          backgroundColor: '#121214',
          borderLeft: '1px solid #27272a',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          color: '#f4f4f5',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#18181b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ActivityIcon size={18} style={{ color: '#fafafa' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fafafa' }}>
                Activity & Audit Log
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>
                Real-time chronological events
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={fetchActivities}
              disabled={loading}
              style={{
                background: 'transparent',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
              }}
              title="Refresh logs"
            >
              <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
              }}
              title="Close drawer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {loading && activities.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
              <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 12px' }} />
              Loading audit activity...
            </div>
          ) : activities.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#71717a' }}>
              <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No activity logged yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Actions like uploading, renaming, deleting, and sharing will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#27272a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getActionIcon(act.action)}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
                        {act.user_name}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#71717a' }}>
                      {act.created_at ? formatRelativeDate(act.created_at) : 'Just now'}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#d4d4d8',
                      lineHeight: '1.4',
                      paddingLeft: '32px',
                    }}
                  >
                    {act.details}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
