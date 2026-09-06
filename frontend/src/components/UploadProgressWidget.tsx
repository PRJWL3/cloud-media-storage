import React, { useState } from 'react';
import { useDrive } from '../context/DriveContext';
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';

export const UploadProgressWidget: React.FC = () => {
  const { uploadQueue, dismissUpload } = useDrive();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!uploadQueue || uploadQueue.length === 0) return null;

  const activeCount = uploadQueue.filter((item) => item.status === 'uploading').length;
  const completedCount = uploadQueue.filter((item) => item.status === 'completed').length;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '360px',
        maxWidth: 'calc(100vw - 48px)',
        backgroundColor: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        overflow: 'hidden',
        color: '#f4f4f5',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#121214',
          borderBottom: isMinimized ? 'none' : '1px solid #27272a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeCount > 0 ? (
            <Loader2 size={16} className="spin-animation" style={{ color: '#38bdf8' }} />
          ) : (
            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
          )}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>
            {activeCount > 0
              ? `Uploading ${activeCount} file${activeCount > 1 ? 's' : ''}...`
              : `${completedCount} upload${completedCount > 1 ? 's' : ''} finished`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
            }}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Body List */}
      {!isMinimized && (
        <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px 12px' }}>
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '10px 8px',
                borderBottom: '1px solid #27272a',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#fafafa',
                  }}
                  title={item.name}
                >
                  {item.name}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.status === 'uploading' && (
                    <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                      {item.speed || ''} {item.progress}%
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                  )}
                  {item.status === 'error' && (
                    <span title={item.error || 'Error'} style={{ display: 'flex' }}>
                      <AlertCircle size={14} style={{ color: '#ef4444' }} />
                    </span>
                  )}
                  <button
                    onClick={() => dismissUpload(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#71717a',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                    }}
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '4px',
                  width: '100%',
                  backgroundColor: '#27272a',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${item.progress}%`,
                    backgroundColor:
                      item.status === 'error'
                        ? '#ef4444'
                        : item.status === 'completed'
                        ? '#22c55e'
                        : '#38bdf8',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>

              {item.error && (
                <span style={{ fontSize: '11px', color: '#ef4444', wordBreak: 'break-word' }}>
                  {item.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
