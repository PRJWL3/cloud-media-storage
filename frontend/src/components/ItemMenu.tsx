import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Eye,
  Star,
  Share2,
  FolderInput,
  Edit2,
  Trash2,
  RotateCcw,
  Download,
  History,
} from 'lucide-react';
import type { FileItem, Folder } from '../types/drive';

interface ItemMenuProps {
  item: FileItem | Folder;
  type: 'file' | 'folder';
  isTrashView?: boolean;
  onPreview?: () => void;
  onToggleStar?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  onRename?: () => void;
  onViewVersions?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}

export const ItemMenu: React.FC<ItemMenuProps> = ({
  item,
  type,
  isTrashView,
  onPreview,
  onToggleStar,
  onShare,
  onMove,
  onRename,
  onViewVersions,
  onDelete,
  onRestore,
  onPermanentDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const file = type === 'file' ? (item as FileItem) : null;

  return (
    <div className={`item-menu-container ${isOpen ? 'menu-open' : ''}`} ref={menuRef}>
      <button
        className="menu-trigger-btn"
        title="More options"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          className="dropdown-menu"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          {isTrashView ? (
            <>
              {onRestore && (
                <button className="dropdown-item" onClick={onRestore}>
                  <RotateCcw size={14} />
                  <span>Restore</span>
                </button>
              )}
              {onPermanentDelete && (
                <button className="dropdown-item danger" onClick={onPermanentDelete}>
                  <Trash2 size={14} />
                  <span>Delete Forever</span>
                </button>
              )}
            </>
          ) : (
            <>
              {type === 'file' && onPreview && (
                <button className="dropdown-item" onClick={onPreview}>
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
              )}

              {type === 'file' && onToggleStar && (
                <button className={`dropdown-item ${file?.starred ? 'item-starred' : ''}`} onClick={onToggleStar}>
                  <Star
                    size={14}
                    fill={file?.starred ? '#facc15' : 'none'}
                    stroke={file?.starred ? '#facc15' : 'currentColor'}
                  />
                  <span>{file?.starred ? 'Unstar' : 'Star'}</span>
                </button>
              )}

              {type === 'file' && onShare && (
                <button className="dropdown-item" onClick={onShare}>
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
              )}

              {type === 'file' && onViewVersions && (
                <button className="dropdown-item" onClick={onViewVersions}>
                  <History size={14} />
                  <span>Version History</span>
                </button>
              )}

              {onMove && (
                <button className="dropdown-item" onClick={onMove}>
                  <FolderInput size={14} />
                  <span>Move</span>
                </button>
              )}

              {onRename && (
                <button className="dropdown-item" onClick={onRename}>
                  <Edit2 size={14} />
                  <span>Rename</span>
                </button>
              )}

              {type === 'file' && (
                <a
                  className="dropdown-item"
                  href={file?.public_url || '#'}
                  download={file?.name}
                  onClick={(e) => {
                    if (!file?.public_url) {
                      e.preventDefault();
                      alert(`Downloading ${file?.name}...`);
                    }
                  }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              )}

              <div className="dropdown-divider" />

              {onDelete && (
                <button className="dropdown-item danger" onClick={onDelete}>
                  <Trash2 size={14} />
                  <span>Move to Trash</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
