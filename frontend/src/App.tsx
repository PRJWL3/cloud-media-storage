import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { DriveProvider, useDrive } from './context/DriveContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { DropZone } from './components/DropZone';
import { FileGrid } from './components/FileGrid';
import { FileList } from './components/FileList';
import { CreateFolderModal } from './components/modals/CreateFolderModal';
import { ShareModal } from './components/modals/ShareModal';
import { MoveModal } from './components/modals/MoveModal';
import { FilePreviewModal } from './components/modals/FilePreviewModal';
import { AuthModal } from './components/modals/AuthModal';
import { ActivityDrawer } from './components/modals/ActivityDrawer';
import { VersionHistoryModal } from './components/modals/VersionHistoryModal';
import { UploadProgressWidget } from './components/UploadProgressWidget';
import { PublicShareView } from './components/PublicShareView';
import type { FileItem, Folder } from './types/drive';

const MainDriveContent: React.FC = () => {
  const {
    viewMode,
    currentView,
    createFolder,
    uploadFiles,
  } = useDrive();

  // Hidden file input for file upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Modal states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{
    item: FileItem | Folder;
    type: 'file' | 'folder';
  } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Apply theme to body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTriggerPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="app-layout">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        style={{ display: 'none' }}
      />

      {/* Left Sidebar */}
      <Sidebar
        onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
        onTriggerUpload={handleTriggerPicker}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <div className="main-content-wrapper">
        <Navbar
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenActivity={() => setIsActivityOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <Breadcrumbs
          onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
          onTriggerUpload={handleTriggerPicker}
        />

        <main className="view-scroll-area">
          {/* Upload Drop Zone in My Drive view */}
          {currentView === 'my-drive' && (
            <DropZone onTriggerPicker={handleTriggerPicker} />
          )}

          {/* Render Active View: Grid or List */}
          {viewMode === 'grid' ? (
            <FileGrid
              onPreview={(file) => setPreviewFile(file)}
              onShare={(file) => setShareFile(file)}
              onMove={(item, type) => setMoveTarget({ item, type })}
              onViewVersions={(file) => setVersionHistoryFile(file)}
            />
          ) : (
            <FileList
              onPreview={(file) => setPreviewFile(file)}
              onShare={(file) => setShareFile(file)}
              onMove={(item, type) => setMoveTarget({ item, type })}
              onViewVersions={(file) => setVersionHistoryFile(file)}
            />
          )}
        </main>
      </div>

      {/* Modals & Slide-overs */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={(name) => createFolder(name)}
      />

      <ShareModal
        isOpen={Boolean(shareFile)}
        onClose={() => setShareFile(null)}
        file={shareFile}
      />

      <MoveModal
        isOpen={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        item={moveTarget?.item || null}
        itemType={moveTarget?.type || 'file'}
      />

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onShare={(file) => setShareFile(file)}
      />

      <VersionHistoryModal
        isOpen={Boolean(versionHistoryFile)}
        onClose={() => setVersionHistoryFile(null)}
        file={versionHistoryFile}
      />

      <ActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Docked Upload Progress Widget */}
      <UploadProgressWidget />
    </div>
  );
};

export default function App() {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/s/')) {
    const token = pathname.substring(3).replace(/^\/+|\/+$/g, '');
    if (token) {
      return <PublicShareView token={token} />;
    }
  }

  return (
    <AuthProvider>
      <DriveProvider>
        <MainDriveContent />
      </DriveProvider>
    </AuthProvider>
  );
}