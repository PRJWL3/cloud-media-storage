import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { FileItem, FileVersionItem } from '../../types/drive';
import { X, History, Download, RefreshCw, FileText } from 'lucide-react';
import { formatBytes, formatRelativeDate } from '../../utils/formatters';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose, file }) => {
  const [versions, setVersions] = useState<FileVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;
    let isMounted = true;
    apiClient.getFileVersions(file.id)
      .then((data) => {
        if (isMounted) setVersions(data);
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load version history');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const currentVersionNumber = versions.length + 1;

  const handleDownloadVersion = (versionId: number) => {
    const url = apiClient.getFileVersionDownloadUrl(file.id, versionId);
    window.open(url, '_blank');
  };

  const handleDownloadCurrent = () => {
    const url = `http://127.0.0.1:8000/api/files/${file.id}/download`;
    window.open(url, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '520px',
          maxWidth: '100%',
          backgroundColor: '#121214',
          border: '1px solid #27272a',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          color: '#f4f4f5',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            <History size={18} style={{ color: '#38bdf8' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fafafa' }}>
                Version History
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#a1a1aa',
                  maxWidth: '360px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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

          {/* Current Version Card */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Active Version
            </span>
            <div
              style={{
                marginTop: '8px',
                padding: '14px 16px',
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    backgroundColor: '#38bdf8',
                    color: '#09090b',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  v{currentVersionNumber} (Current)
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#fafafa' }}>
                    {formatBytes(file.size)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                    Updated {file.updated_at ? formatRelativeDate(file.updated_at) : 'recently'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadCurrent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#27272a',
                  color: '#fafafa',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Download size={13} />
                Download
              </button>
            </div>
          </div>

          {/* Previous Versions */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Archived Previous Versions ({versions.length})
            </span>

            {loading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                <RefreshCw size={20} className="spin-animation" style={{ margin: '0 auto 8px' }} />
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div
                style={{
                  marginTop: '8px',
                  padding: '24px 16px',
                  border: '1px dashed #27272a',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#71717a',
                  fontSize: '13px',
                }}
              >
                <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                No prior versions. Re-uploading a file with the same name automatically creates version history archives.
              </div>
            ) : (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          backgroundColor: '#27272a',
                          color: '#e4e4e7',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #3f3f46',
                        }}
                      >
                        v{ver.version_number}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#f4f4f5' }}>
                          {formatBytes(ver.size)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#71717a' }}>
                          Archived {formatRelativeDate(ver.created_at)} by {ver.uploader_name}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadVersion(ver.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#27272a',
                        color: '#e4e4e7',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={13} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #27272a',
            backgroundColor: '#18181b',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#27272a',
              color: '#fafafa',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
