import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { PublicShareInfo } from '../types/drive';
import {
  Lock,
  Download,
  AlertCircle,
  FileText,
  Clock,
  User as UserIcon,
  HardDrive,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { formatBytes, formatRelativeDate } from '../utils/formatters';

interface PublicShareViewProps {
  token: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token }) => {
  const [shareInfo, setShareInfo] = useState<PublicShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password state
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [accessPass, setAccessPass] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const fetchShare = async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await apiClient.getPublicShare(token);
        setShareInfo(info);
        if (!info.requires_password) {
          setIsUnlocked(true);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'This share link does not exist or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [token]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Please enter the password');
      return;
    }

    setIsVerifying(true);
    setPasswordError(null);
    try {
      const res = await apiClient.verifyPublicShare(token, password);
      if (res.valid) {
        setAccessPass(res.access_pass || null);
        setIsUnlocked(true);
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = () => {
    const url = apiClient.getPublicShareDownloadUrl(token, accessPass || undefined, password || undefined);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          gap: '16px',
        }}
      >
        <RefreshCw size={32} className="spin-animation" style={{ color: '#38bdf8' }} />
        <p style={{ fontSize: '14px', color: '#a1a1aa' }}>Loading shared file...</p>
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            backgroundColor: '#121214',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '32px 24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <AlertCircle size={44} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Link Unavailable</h2>
          <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px' }}>
            {error || 'This link may have been revoked, expired, or removed by the owner.'}
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#27272a',
              color: '#fafafa',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Go to Cloud Storage
          </button>
        </div>
      </div>
    );
  }

  if (shareInfo.is_expired) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            backgroundColor: '#121214',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '32px 24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Clock size={44} style={{ color: '#facc15', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Link Expired</h2>
          <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px' }}>
            This share link expired on {shareInfo.expires_at ? new Date(shareInfo.expires_at).toLocaleString() : 'recently'}. Please ask the owner to generate a new share link.
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#27272a',
              color: '#fafafa',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Password Prompt UI
  if (shareInfo.requires_password && !isUnlocked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#121214',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '32px 28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Lock size={22} style={{ color: '#38bdf8' }} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px' }}>Password Protected File</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              This file is protected with a password. Enter it below to preview or download.
            </p>
          </div>

          <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#18181b',
                  border: passwordError ? '1px solid #ef4444' : '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fafafa',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {passwordError && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
                  {passwordError}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                padding: '10px 16px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={14} className="spin-animation" />
                  Verifying...
                </>
              ) : (
                'Unlock File'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Unlocked Preview & Download View
  const viewUrl = apiClient.getPublicShareViewUrl(token, accessPass || undefined, password || undefined);
  const isImage = shareInfo.mime_type.startsWith('image/');
  const isPdf = shareInfo.mime_type.includes('pdf');
  const isVideo = shareInfo.mime_type.startsWith('video/');
  const isAudio = shareInfo.mime_type.startsWith('audio/');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#09090b',
        color: '#f4f4f5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid #27272a',
          backgroundColor: '#121214',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={18} style={{ color: '#fafafa' }} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#fafafa',
                maxWidth: '450px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shareInfo.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#a1a1aa' }}>
              <span>{formatBytes(shareInfo.size)}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserIcon size={12} /> {shareInfo.owner_name}
              </span>
              {shareInfo.expires_at && (
                <>
                  <span>•</span>
                  <span>Expires {formatRelativeDate(shareInfo.expires_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            backgroundColor: '#fafafa',
            color: '#09090b',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Download size={15} />
          Download
        </button>
      </header>

      {/* Main Preview Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          overflow: 'auto',
        }}
      >
        {isImage ? (
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '75vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={viewUrl}
              alt={shareInfo.name}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #27272a',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
              }}
            />
          </div>
        ) : isPdf ? (
          <iframe
            src={viewUrl}
            title={shareInfo.name}
            style={{
              width: '85vw',
              height: '80vh',
              border: '1px solid #27272a',
              borderRadius: '8px',
              backgroundColor: '#18181b',
            }}
          />
        ) : isVideo ? (
          <video
            controls
            src={viewUrl}
            style={{
              maxWidth: '85vw',
              maxHeight: '75vh',
              borderRadius: '8px',
              border: '1px solid #27272a',
              backgroundColor: '#000',
            }}
          />
        ) : isAudio ? (
          <div
            style={{
              backgroundColor: '#18181b',
              padding: '32px 40px',
              borderRadius: '12px',
              border: '1px solid #27272a',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '420px',
            }}
          >
            <FileText size={48} style={{ color: '#38bdf8', margin: '0 auto' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{shareInfo.name}</div>
            <audio controls src={viewUrl} style={{ width: '100%' }} />
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#121214',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <FileCheck size={56} style={{ color: '#a1a1aa' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{shareInfo.name}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>
              {formatBytes(shareInfo.size)} • {shareInfo.mime_type}
            </p>
            <button
              onClick={handleDownload}
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              Download File
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
