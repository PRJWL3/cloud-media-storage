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
  ArrowUpDown,
  FolderOpen,
  Eye,
} from 'lucide-react';
import type { FileItem, Folder, SortField } from '../types/drive';
import { useDrive } from '../context/DriveContext';
import { formatBytes, formatDate } from '../utils/formatters';
import { ItemMenu } from './ItemMenu';

interface FileListProps {
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onMove: (item: FileItem | Folder, type: 'file' | 'folder') => void;
  onViewVersions?: (file: FileItem) => void;
}

export const FileList: React.FC<FileListProps> = ({ onPreview, onShare, onMove, onViewVersions }) => {
  const {
    currentFolders,
    currentFiles,
    setCurrentFolderId,
    currentView,
    sortField,
    sortOrder,
    setSort,
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

  const getFileIcon = (mime: string, name: string) => {
    if (mime.startsWith('image/')) return <ImageIcon size={18} />;
    if (mime.startsWith('video/')) return <Video size={18} />;
    if (mime.startsWith('audio/')) return <Music size={18} />;
    if (mime.includes('sql') || name.endsWith('.ts') || name.endsWith('.js')) {
      return <FileCode size={18} />;
    }
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) {
      return <FileText size={18} />;
    }
    return <File size={18} />;
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field, 'asc');
    }
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
    <div className="file-list-table-wrapper">
      <table className="drive-table">
        <thead>
          <tr>
            <th className="th-star"></th>
            <th className="th-name" onClick={() => handleSortClick('name')}>
              <div className="th-content">
                <span>Name</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th className="th-size" onClick={() => handleSortClick('size')}>
              <div className="th-content">
                <span>Size</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th className="th-modified" onClick={() => handleSortClick('updated_at')}>
              <div className="th-content">
                <span>Last Modified</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th className="th-actions"></th>
          </tr>
        </thead>
        <tbody>
          {/* Folders First */}
          {currentFolders.map((folder) => (
            <tr
              key={`folder-${folder.id}`}
              className="table-row folder-row"
              onDoubleClick={() => !isTrash && setCurrentFolderId(folder.id)}
            >
              <td className="td-star"></td>
              <td className="td-name">
                <div className="item-name-cell">
                  <div
                    className="item-type-icon folder-color"
                    onClick={() => !isTrash && setCurrentFolderId(folder.id)}
                  >
                    <FolderIcon size={18} />
                  </div>
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
                      className="item-title clickable"
                      onClick={() => !isTrash && setCurrentFolderId(folder.id)}
                    >
                      {folder.name}
                    </span>
                  )}
                </div>
              </td>
              <td className="td-size text-muted">—</td>
              <td className="td-modified text-muted">{formatDate(folder.updated_at)}</td>
              <td className="td-actions">
                <ItemMenu
                  item={folder}
                  type="folder"
                  isTrashView={isTrash}
                  onMove={() => onMove(folder, 'folder')}
                  onRename={() => {
                    setEditingItemId(`folder-${folder.id}`);
                    setEditingName(folder.name);
                  }}
                  onDelete={() => deleteFolder(folder.id)}
                  onRestore={() => restoreFolder(folder.id)}
                  onPermanentDelete={() => {
                    if (confirm(`Permanently delete folder "${folder.name}"?`)) {
                      permanentDeleteFolder(folder.id);
                    }
                  }}
                />
              </td>
            </tr>
          ))}

          {/* Files */}
          {currentFiles.map((file) => {
            const shared = isFileShared(file.id);
            return (
              <tr
                key={`file-${file.id}`}
                className="table-row file-row clickable-row"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    !target.closest('.td-star') &&
                    !target.closest('.td-actions') &&
                    !target.closest('input')
                  ) {
                    if (!isTrash) onPreview(file);
                  }
                }}
                onDoubleClick={() => !isTrash && onPreview(file)}
              >
                <td className="td-star">
                  {!isTrash && (
                    <button
                      className={`star-table-btn ${file.starred ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(file.id);
                      }}
                      title={file.starred ? 'Unstar' : 'Star'}
                    >
                      <Star
                        size={14}
                        fill={file.starred ? '#facc15' : 'none'}
                        stroke={file.starred ? '#facc15' : 'currentColor'}
                      />
                    </button>
                  )}
                </td>
                <td className="td-name">
                  <div className="item-name-cell">
                    <div
                      className="item-type-icon"
                      onClick={() => !isTrash && onPreview(file)}
                    >
                      {getFileIcon(file.mime_type, file.name)}
                    </div>
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
                      <div className="name-wrapper">
                        <span
                          className="item-title clickable"
                          onClick={() => !isTrash && onPreview(file)}
                        >
                          {file.name}
                        </span>
                        {shared && (
                          <span className="file-shared-badge-inline" title="Shared">
                            <Share2 size={11} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="td-size text-muted">{formatBytes(file.size)}</td>
                <td className="td-modified text-muted">{formatDate(file.updated_at)}</td>
                <td className="td-actions">
                  <div className="table-actions-group">
                    {!isTrash && (
                      <button
                        className="table-quick-action-btn"
                        title="Preview"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(file);
                        }}
                      >
                        <Eye size={14} />
                      </button>
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
                      onRename={() => {
                        setEditingItemId(`file-${file.id}`);
                        setEditingName(file.name);
                      }}
                      onDelete={() => deleteFile(file.id)}
                      onRestore={() => restoreFile(file.id)}
                      onPermanentDelete={() => {
                        if (confirm(`Permanently delete "${file.name}"?`)) {
                          permanentDeleteFile(file.id);
                        }
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
