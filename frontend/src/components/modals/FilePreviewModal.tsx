import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Star,
  Share2,
  FileText,
  Calendar,
  HardDrive,
  Folder as FolderIcon,
  Tag,
  Music,
  ExternalLink,
} from 'lucide-react';
import type { FileItem } from '../../types/drive';
import { formatBytes, formatDate } from '../../utils/formatters';
import { useDrive } from '../../context/DriveContext';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  onShare: (file: FileItem) => void;
}

const TextPreview: React.FC<{ url: string; name: string }> = ({ url, name }) => {
  const [content, setContent] = useState<string>('Loading file preview...');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load text');
        return res.text();
      })
      .then((text) => setContent(text))
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return (
      <div className="preview-doc-wrapper">
        <FileText size={64} className="doc-icon-large" />
        <h4>{name}</h4>
        <p className="doc-desc">Text preview could not be loaded directly.</p>
      </div>
    );
  }

  return (
    <div className="preview-text-container">
      <pre className="preview-text-content">{content}</pre>
    </div>
  );
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file: initialFile,
  onShare,
}) => {
  const { toggleStar, folders, files } = useDrive();

  if (!isOpen || !initialFile) return null;

  // Reactively track this file so star toggling and metadata stay up to date
  const file = files.find((f) => f.id === initialFile.id) || initialFile;

  const parentFolder = folders.find((f) => f.id === file.folder_id);
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isText =
    file.mime_type.startsWith('text/') ||
    file.name.endsWith('.sql') ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.ts') ||
    file.name.endsWith('.js');

  const downloadUrl = `http://127.0.0.1:8000/api/files/${file.id}/download`;

  const renderPreviewContent = () => {
    if (isImage) {
      return (
        <div className="preview-media-wrapper">
          <img
            src={file.public_url}
            alt={file.name}
            className="preview-image"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="preview-pdf-wrapper">
          <iframe
            src={file.public_url}
            title={file.name}
            className="preview-pdf-frame"
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="preview-media-wrapper">
          <video controls autoPlay={false} className="preview-video" src={file.public_url}>
            Your browser does not support HTML5 video.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="preview-doc-wrapper">
          <div className="doc-icon-large">
            <Music size={64} />
          </div>
          <h4>{file.name}</h4>
          <audio controls src={file.public_url} className="preview-audio-player" />
        </div>
      );
    }

    if (isText && file.public_url) {
      return <TextPreview url={file.public_url} name={file.name} />;
    }

    return (
      <div className="preview-doc-wrapper">
        <div className="doc-icon-large">
          <FileText size={64} />
        </div>
        <h4>{file.name}</h4>
        <p className="doc-desc">Preview is not directly viewable in browser. Download to view.</p>
        <a href={downloadUrl} download={file.name} className="btn btn-primary">
          <Download size={16} />
          <span>Download File</span>
        </a>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>{file.name}</h3>
          </div>
          <div className="preview-header-actions">
            <a
              href={file.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="Open full in new tab"
            >
              <ExternalLink size={18} />
            </a>
            <button
              className={`icon-btn star-modal-btn ${file.starred ? 'active-star' : ''}`}
              title={file.starred ? 'Unstar' : 'Star'}
              onClick={() => toggleStar(file.id)}
            >
              <Star
                size={18}
                fill={file.starred ? '#facc15' : 'none'}
                stroke={file.starred ? '#facc15' : 'currentColor'}
              />
            </button>
            <button
              className="icon-btn"
              title="Share"
              onClick={() => {
                onClose();
                onShare(file);
              }}
            >
              <Share2 size={18} />
            </button>
            <a
              href={downloadUrl}
              download={file.name}
              className="icon-btn"
              title="Download"
            >
              <Download size={18} />
            </a>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="preview-modal-content">
          {/* Main Visual Preview */}
          <div className="preview-stage">{renderPreviewContent()}</div>

          {/* Metadata Sidebar */}
          <div className="preview-details-sidebar">
            <h4 className="details-heading">File Information</h4>

            <div className="detail-row">
              <span className="detail-label">
                <Tag size={14} /> Type
              </span>
              <span className="detail-value">{file.mime_type}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                <HardDrive size={14} /> Size
              </span>
              <span className="detail-value">{formatBytes(file.size)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                <FolderIcon size={14} /> Location
              </span>
              <span className="detail-value">{parentFolder ? parentFolder.name : 'My Drive'}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                <Calendar size={14} /> Modified
              </span>
              <span className="detail-value">{formatDate(file.updated_at)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                <Calendar size={14} /> Created
              </span>
              <span className="detail-value">{formatDate(file.created_at)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Storage Path</span>
              <span className="detail-value font-mono text-xs">{file.storage_path}</span>
            </div>

            <div className="preview-sidebar-actions">
              <a href={downloadUrl} download={file.name} className="btn btn-primary full-width">
                <Download size={15} />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
