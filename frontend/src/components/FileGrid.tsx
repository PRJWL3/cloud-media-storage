import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileCode,
  File,
  Star,
  Share2,
  FolderOpen,
  Eye,
} from 'lucide-react';
import type { FileItem, Folder } from '../types/drive';
import { useDrive } from '../context/DriveContext';
import { formatBytes, formatDate, getFileTypeBadge } from '../utils/formatters';
import { ItemMenu } from './ItemMenu';

interface FileGridProps {
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onMove: (item: FileItem | Folder, type: 'file' | 'folder') => void;
  onViewVersions?: (file: FileItem) => void;
}

const ThumbnailDisplay: React.FC<{ file: FileItem; icon: React.ReactNode }> = ({ file, icon }) => {
  const [loadError, setLoadError] = useState(false);

  if (file.public_url && file.mime_type.startsWith('image/') && !loadError) {
    return (
      <img
        src={file.public_url}
        alt={file.name}
        className="file-thumbnail"
        loading="lazy"
        onError={() => setLoadError(true)}
      />
    );
  }

  if (file.public_url && file.mime_type.startsWith('video/') && !loadError) {
    return (
      <video
        src={file.public_url}
        className="file-thumbnail"
        preload="metadata"
        muted
        playsInline
        onError={() => setLoadError(true)}
      />
    );
  }

  return <div className="file-icon-placeholder">{icon}</div>;
};

export const FileGrid: React.FC<FileGridProps> = ({ onPreview, onShare, onMove, onViewVersions }) => {
  const {
    currentFolders,
    currentFiles,
    setCurrentFolderId,
    currentView,
    toggleStar,
    deleteFolder,
    restoreFolder,
    permanentDeleteFolder,
    renameFolder,
    deleteFile,
    restoreFile,
    permanentDeleteFile,
    renameFile,
    shares,
    linkShares,
  } = useDrive();

  const isTrash = currentView === 'trash';

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const getFileIcon = (file: FileItem) => {
    if (file.mime_type.startsWith('image/')) return <ImageIcon size={28} />;
    if (file.mime_type.startsWith('video/')) return <Video size={28} />;
    if (file.mime_type.startsWith('audio/')) return <Music size={28} />;
    if (file.mime_type.includes('sql') || file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      return <FileCode size={28} />;
    }
    if (file.mime_type.includes('pdf') || file.mime_type.includes('word') || file.mime_type.includes('text')) {
      return <FileText size={28} />;
    }
    return <File size={28} />;
  };

  const handleStartRename = (id: number, name: string, type: 'file' | 'folder') => {
    setEditingItemId(`${type}-${id}`);
    setEditingName(name);
  };

  const handleSaveRename = (id: number, type: 'file' | 'folder') => {
    if (editingName.trim()) {
      if (type === 'folder') renameFolder(id, editingName);
      else renameFile(id, editingName);
    }
    setEditingItemId(null);
  };

  const isFileShared = (fileId: number) => {
    return shares.some((s) => s.file_id === fileId) || linkShares.some((ls) => ls.file_id === fileId);
  };

  if (currentFolders.length === 0 && currentFiles.length === 0) {
    return (
      <div className="empty-state">
        <FolderOpen size={48} className="empty-icon" />
        <h3 className="empty-title">No items found</h3>
        <p className="empty-desc">
          {isTrash
            ? 'Your trash is clean and empty.'
            : currentView === 'starred'
            ? 'Star files to quickly access them here.'
            : currentView === 'shared'
            ? 'Files shared with you will appear here.'
            : 'Upload a file or create a folder to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="drive-grid-container">
      {/* Folders Section */}
      {currentFolders.length > 0 && (
        <section className="grid-section">
          <h3 className="section-title">Folders</h3>
          <div className="folders-grid">
            {currentFolders.map((folder) => (
              <div
                key={folder.id}
                className="folder-card"
                onDoubleClick={() => !isTrash && setCurrentFolderId(folder.id)}
              >
                <div className="folder-card-top">
                  <div
                    className="folder-icon-box"
                    onClick={() => !isTrash && setCurrentFolderId(folder.id)}
                  >
                    <FolderIcon size={24} />
                  </div>

                  <ItemMenu
                    item={folder}
                    type="folder"
                    isTrashView={isTrash}
                    onMove={() => onMove(folder, 'folder')}
                    onRename={() => handleStartRename(folder.id, folder.name, 'folder')}
                    onDelete={() => deleteFolder(folder.id)}
                    onRestore={() => restoreFolder(folder.id)}
                    onPermanentDelete={() => {
                      if (confirm(`Permanently delete folder "${folder.name}"?`)) {
                        permanentDeleteFolder(folder.id);
                      }
                    }}
                  />
                </div>

                <div className="folder-card-body">
                  {editingItemId === `folder-${folder.id}` ? (
                    <input
                      type="text"
                      className="inline-rename-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleSaveRename(folder.id, 'folder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(folder.id, 'folder');
                        if (e.key === 'Escape') setEditingItemId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="folder-name"
                      title={folder.name}
                      onClick={() => !isTrash && setCurrentFolderId(folder.id)}
                    >
                      {folder.name}
                    </span>
                  )}
                  <span className="folder-meta">{formatDate(folder.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Files Section */}
      {currentFiles.length > 0 && (
        <section className="grid-section">
          <h3 className="section-title">Files</h3>
          <div className="files-grid">
            {currentFiles.map((file) => {
              const shared = isFileShared(file.id);
              return (
                <div
                  key={file.id}
                  className="file-card"
                  onClick={(e) => {
                    const el = e.target as HTMLElement;
                    if (!el.closest('.star-quick-btn') && !el.closest('.item-menu-container') && !el.closest('input')) {
                      if (!isTrash) onPreview(file);
                    }
                  }}
                  onDoubleClick={() => !isTrash && onPreview(file)}
                >
                  {/* Thumbnail / Visual header */}
                  <div
                    className="file-card-preview"
                    onClick={() => !isTrash && onPreview(file)}
                  >
                    <ThumbnailDisplay file={file} icon={getFileIcon(file)} />

                    {/* Hover Quick Preview Overlay */}
                    {!isTrash && (
                      <div className="card-preview-overlay">
                        <span className="preview-pill">
                          <Eye size={13} />
                          <span>Preview</span>
                        </span>
                      </div>
                    )}

                    <span className="file-ext-badge">
                      {getFileTypeBadge(file.mime_type, file.name)}
                    </span>

                    {shared && (
                      <span className="file-shared-badge" title="Shared item">
                        <Share2 size={12} />
                      </span>
                    )}

                    {!isTrash && (
                      <button
                        className={`star-quick-btn ${file.starred ? 'active' : ''}`}
                        title={file.starred ? 'Unstar' : 'Star'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(file.id);
                        }}
                      >
                        <Star
                          size={14}
                          fill={file.starred ? '#facc15' : 'none'}
                          stroke={file.starred ? '#facc15' : 'currentColor'}
                        />
                      </button>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="file-card-info">
                    <div className="file-name-row">
                      {editingItemId === `file-${file.id}` ? (
                        <input
                          type="text"
                          className="inline-rename-input"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleSaveRename(file.id, 'file')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(file.id, 'file');
                            if (e.key === 'Escape') setEditingItemId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="file-title"
                          title={file.name}
                          onClick={() => !isTrash && onPreview(file)}
                        >
                          {file.name}
                        </span>
                      )}

                      <ItemMenu
                        item={file}
                        type="file"
                        isTrashView={isTrash}
                        onPreview={() => onPreview(file)}
                        onToggleStar={() => toggleStar(file.id)}
                        onShare={() => onShare(file)}
                        onViewVersions={() => onViewVersions && onViewVersions(file)}
                        onMove={() => onMove(file, 'file')}
                        onRename={() => handleStartRename(file.id, file.name, 'file')}
                        onDelete={() => deleteFile(file.id)}
                        onRestore={() => restoreFile(file.id)}
                        onPermanentDelete={() => {
                          if (confirm(`Permanently delete "${file.name}"?`)) {
                            permanentDeleteFile(file.id);
                          }
                        }}
                      />
                    </div>

                    <div className="file-sub-row">
                      <span>{formatBytes(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.updated_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
