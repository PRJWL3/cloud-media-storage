import React, { useState } from 'react';
import { X, Folder as FolderIcon, HardDrive, ArrowRight } from 'lucide-react';
import type { FileItem, Folder } from '../../types/drive';
import { useDrive } from '../../context/DriveContext';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileItem | Folder | null;
  itemType: 'file' | 'folder';
}

export const MoveModal: React.FC<MoveModalProps> = ({ isOpen, onClose, item, itemType }) => {
  const { folders, moveFile, moveFolder } = useDrive();
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  if (!isOpen || !item) return null;

  // Filter out the item itself and any invalid targets if it's a folder
  const availableFolders = folders.filter((f) => {
    if (f.deleted_at !== null) return false;
    if (itemType === 'folder' && f.id === item.id) return false;
    return true;
  });

  const handleMove = () => {
    if (itemType === 'file') {
      moveFile(item.id, selectedFolderId);
    } else {
      moveFolder(item.id, selectedFolderId);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ArrowRight size={20} />
            <h3>Move "{item.name}"</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="input-label">Select destination folder:</p>
          <div className="folder-selection-list">
            <div
              className={`folder-select-item ${selectedFolderId === null ? 'selected' : ''}`}
              onClick={() => setSelectedFolderId(null)}
            >
              <HardDrive size={18} />
              <span>My Drive (Root)</span>
            </div>

            {availableFolders.map((f) => (
              <div
                key={f.id}
                className={`folder-select-item ${selectedFolderId === f.id ? 'selected' : ''}`}
                onClick={() => setSelectedFolderId(f.id)}
              >
                <FolderIcon size={18} />
                <span>{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleMove}>
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};
