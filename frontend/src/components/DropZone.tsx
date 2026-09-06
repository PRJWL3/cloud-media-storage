import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useDrive } from '../context/DriveContext';

interface DropZoneProps {
  onTriggerPicker: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onTriggerPicker }) => {
  const { uploadFiles, isUploading, uploadProgress } = useDrive();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      className={`drop-zone-banner ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onTriggerPicker}
    >
      <div className="drop-zone-content">
        <div className="drop-zone-icon">
          <UploadCloud size={24} />
        </div>
        <div className="drop-zone-text">
          {isUploading ? (
            <div>
              <p className="drop-title">Uploading files... {uploadProgress}%</p>
              <div className="upload-progress-bar">
                <div className="upload-progress-inner" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <div>
              <p className="drop-title">
                {isDragOver ? 'Drop files here to upload' : 'Drag & drop media files here'}
              </p>
              <p className="drop-subtitle">or click to browse from your device</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
