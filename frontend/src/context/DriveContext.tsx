import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Folder,
  FileItem,
  Share,
  LinkShare,
  Star,
  DriveView,
  ViewMode,
  SortField,
  SortOrder,
  FileFilterType,
  UploadProgressItem,
} from '../types/drive';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';

interface DriveContextType {
  // Navigation & View
  currentView: DriveView;

  setCurrentView: (view: DriveView) => void;
  currentFolderId: number | null;
  setCurrentFolderId: (id: number | null) => void;
  breadcrumbs: { id: number | null; name: string }[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: FileFilterType;
  setFilterType: (type: FileFilterType) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  setSort: (field: SortField, order: SortOrder) => void;

  // Folders & Files
  folders: Folder[];
  files: FileItem[];
  currentFolders: Folder[];
  currentFiles: FileItem[];
  allCurrentItemsCount: number;
  isLoading: boolean;
  refreshData: () => Promise<void>;

  // Folder Actions
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: number, newName: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
  restoreFolder: (id: number) => Promise<void>;
  permanentDeleteFolder: (id: number) => Promise<void>;
  moveFolder: (folderId: number, targetParentId: number | null) => Promise<void>;

  // File Actions
  uploadFiles: (fileList: File[]) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  uploadQueue: UploadProgressItem[];
  dismissUpload: (id: string) => void;
  renameFile: (id: number, newName: string) => Promise<void>;
  deleteFile: (id: number) => Promise<void>;
  restoreFile: (id: number) => Promise<void>;
  permanentDeleteFile: (id: number) => Promise<void>;
  moveFile: (fileId: number, targetFolderId: number | null) => Promise<void>;
  toggleStar: (fileId: number) => Promise<void>;

  // Sharing
  shares: Share[];
  linkShares: LinkShare[];
  stars: Star[];
  addShare: (fileId: number, email: string, role: 'viewer' | 'editor') => Promise<Share>;
  removeShare: (shareId: number) => Promise<void>;
  getFileShares: (fileId: number) => Share[];
  createLinkShare: (fileId: number, options?: { expires_at?: string; password?: string }) => Promise<LinkShare>;
  removeLinkShare: (linkShareId: number) => Promise<void>;
  getFileLinkShare: (fileId: number) => LinkShare | undefined;

  // Trash & Stats
  storageUsedBytes: number;
  emptyTrash: () => Promise<void>;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const DriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Navigation states
  const [currentView, setCurrentView] = useState<DriveView>('my-drive');
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileFilterType>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<UploadProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dismissUpload = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Entities state (Zero placeholders - all live from DB & Supabase bucket)
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [linkShares, setLinkShares] = useState<LinkShare[]>([]);
  const [stars, setStars] = useState<Star[]>([]);

  // Fetch real data from backend
  const refreshData = useCallback(async () => {
    try {
      const [fetchedFiles, fetchedFolders, fetchedShares, fetchedLinkShares, fetchedStars] = await Promise.all([
        apiClient.getFiles(currentUser.id).catch(() => []),
        apiClient.getFolders(currentUser.id).catch(() => []),
        apiClient.getShares().catch(() => []),
        apiClient.getLinkShares().catch(() => []),
        apiClient.getStars(currentUser.id).catch(() => []),
      ]);

      setFiles(fetchedFiles);
      setFolders(fetchedFolders);
      setShares(fetchedShares);
      setLinkShares(fetchedLinkShares);
      setStars(fetchedStars);
    } catch (err) {
      console.error('Error fetching live drive data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [fetchedFiles, fetchedFolders, fetchedShares, fetchedLinkShares, fetchedStars] = await Promise.all([
          apiClient.getFiles(currentUser.id).catch(() => []),
          apiClient.getFolders(currentUser.id).catch(() => []),
          apiClient.getShares().catch(() => []),
          apiClient.getLinkShares().catch(() => []),
          apiClient.getStars(currentUser.id).catch(() => []),
        ]);
        if (!ignore) {
          setFiles(fetchedFiles);
          setFolders(fetchedFolders);
          setShares(fetchedShares);
          setLinkShares(fetchedLinkShares);
          setStars(fetchedStars);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching live drive data:', err);
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [currentUser.id]);

  // Reset folder navigation when changing views
  const handleSetCurrentView = useCallback((view: DriveView) => {
    setCurrentView(view);
    setCurrentFolderId(null);
    setSearchQuery('');
  }, []);

  // Compute breadcrumbs path
  const breadcrumbs = useMemo(() => {
    if (currentView !== 'my-drive' || currentFolderId === null) {
      return [{ id: null, name: 'My Drive' }];
    }

    const trail: { id: number | null; name: string }[] = [];
    let currId: number | null = currentFolderId;

    while (currId !== null) {
      const folder = folders.find((f) => f.id === currId);
      if (folder) {
        trail.unshift({ id: folder.id, name: folder.name });
        currId = folder.parent_id;
      } else {
        break;
      }
    }

    trail.unshift({ id: null, name: 'My Drive' });
    return trail;
  }, [currentView, currentFolderId, folders]);

  // Check MIME filter
  const matchesType = (mime: string, type: FileFilterType) => {
    if (type === 'all') return true;
    if (type === 'image') return mime.startsWith('image/');
    if (type === 'video') return mime.startsWith('video/');
    if (type === 'audio') return mime.startsWith('audio/');
    if (type === 'document') {
      return (
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('text') ||
        mime.includes('sheet') ||
        mime.includes('document')
      );
    }
    return !mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/');
  };

  // Filter and sort items based on active view
  const { currentFolders, currentFiles } = useMemo(() => {
    let filteredFolders: Folder[];
    let filteredFiles: FileItem[];

    if (currentView === 'trash') {
      filteredFolders = folders.filter((f) => f.deleted_at !== null && f.owner_id === currentUser.id);
      filteredFiles = files.filter((f) => f.deleted_at !== null && f.owner_id === currentUser.id);
    } else if (currentView === 'starred') {
      filteredFolders = [];
      filteredFiles = files.filter((f) => f.deleted_at === null && f.starred);
    } else if (currentView === 'shared') {
      const userShareFileIds = new Set(
        shares
          .filter(
            (s) =>
              s.shared_with_email.toLowerCase() === currentUser.email.toLowerCase() ||
              s.shared_with_user_id === currentUser.id
          )
          .map((s) => s.file_id)
      );
      filteredFolders = [];
      filteredFiles = files.filter((f) => f.deleted_at === null && userShareFileIds.has(f.id));
    } else {
      // 'my-drive' view
      filteredFolders = folders.filter(
        (f) => f.deleted_at === null && f.owner_id === currentUser.id && f.parent_id === currentFolderId
      );
      filteredFiles = files.filter(
        (f) => f.deleted_at === null && f.owner_id === currentUser.id && f.folder_id === currentFolderId
      );
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredFolders = filteredFolders.filter((f) => f.name.toLowerCase().includes(q));
      filteredFiles = filteredFiles.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Apply Type Filter to files
    if (filterType !== 'all') {
      filteredFiles = filteredFiles.filter((f) => matchesType(f.mime_type, filterType));
    }

    // Sorting
    filteredFolders.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const aDate = new Date(a.updated_at).getTime();
      const bDate = new Date(b.updated_at).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    filteredFiles.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'size') {
        return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
      }
      const aDate = new Date(a.updated_at).getTime();
      const bDate = new Date(b.updated_at).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    return { currentFolders: filteredFolders, currentFiles: filteredFiles };
  }, [
    currentView,
    currentFolderId,
    folders,
    files,
    shares,
    currentUser,
    searchQuery,
    filterType,
    sortField,
    sortOrder,
  ]);

  // Calculate storage used
  const storageUsedBytes = useMemo(() => {
    return files
      .filter((f) => f.owner_id === currentUser.id && f.deleted_at === null)
      .reduce((acc, curr) => acc + curr.size, 0);
  }, [files, currentUser.id]);

  // Real-time Folder CRUD Actions
  const createFolder = async (name: string): Promise<Folder> => {
    const created = await apiClient.createFolder(name, currentFolderId, currentUser.id);
    setFolders((prev) => [...prev, created]);
    return created;
  };

  const renameFolder = async (id: number, newName: string) => {
    await apiClient.updateFolder(id, { name: newName.trim() });
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName.trim(), updated_at: new Date().toISOString() } : f))
    );
  };

  const deleteFolder = async (id: number) => {
    await apiClient.deleteFolder(id, false);
    const now = new Date().toISOString();
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, deleted_at: now } : f)));
  };

  const restoreFolder = async (id: number) => {
    await apiClient.restoreFolder(id);
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, deleted_at: null } : f)));
  };

  const permanentDeleteFolder = async (id: number) => {
    await apiClient.deleteFolder(id, true);
    setFolders((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFolder = async (folderId: number, targetParentId: number | null) => {
    if (folderId === targetParentId) return;
    await apiClient.updateFolder(folderId, { parent_id: targetParentId });
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, parent_id: targetParentId, updated_at: new Date().toISOString() } : f))
    );
  };

  // Real-time File CRUD Actions (Supabase Bucket & PostgreSQL)
  const uploadFiles = async (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const uploadId = `${file.name}-${Date.now()}-${i}`;
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      setUploadQueue((prev) => [
        {
          id: uploadId,
          name: file.name,
          progress: 30,
          status: 'uploading',
          speed: sizeStr,
        },
        ...prev,
      ]);

      try {
        const uploaded = await apiClient.uploadFile(file, currentUser.id, currentFolderId);
        setFiles((prev) => {
          const filtered = prev.filter((f) => f.id !== uploaded.id);
          return [uploaded, ...filtered];
        });
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, progress: 100, status: 'completed' } : item
          )
        );
      } catch (err: unknown) {
        console.error('Upload failed for file:', file.name, err);
        const errMsg = err instanceof Error ? err.message : 'Upload failed';
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, status: 'error', error: errMsg }
              : item
          )
        );
      }
      setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
    }

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
    }, 400);
  };

  const renameFile = async (id: number, newName: string) => {
    try {
      await apiClient.updateFile(id, { name: newName.trim() });
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: newName.trim(), updated_at: new Date().toISOString() } : f))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Permission denied or failed to rename file');
    }
  };

  const deleteFile = async (id: number) => {
    try {
      await apiClient.deleteFile(id, false);
      const now = new Date().toISOString();
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, deleted_at: now } : f)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Permission denied or failed to delete file');
    }
  };

  const restoreFile = async (id: number) => {
    try {
      const restored = await apiClient.restoreFile(id);
      setFiles((prev) => prev.map((f) => (f.id === id ? restored : f)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Permission denied or failed to restore file');
    }
  };

  const permanentDeleteFile = async (id: number) => {
    try {
      await apiClient.deleteFile(id, true);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setShares((prev) => prev.filter((s) => s.file_id !== id));
      setLinkShares((prev) => prev.filter((ls) => ls.file_id !== id));
      setStars((prev) => prev.filter((st) => st.file_id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Permission denied or failed to delete file');
    }
  };

  const moveFile = async (fileId: number, targetFolderId: number | null) => {
    try {
      await apiClient.updateFile(fileId, { folder_id: targetFolderId });
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, folder_id: targetFolderId, updated_at: new Date().toISOString() } : f))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Permission denied or failed to move file');
    }
  };

  const toggleStar = async (fileId: number) => {
    const target = files.find((f) => f.id === fileId);
    if (!target) return;
    const nextStarred = !target.starred;

    // Instant optimistic UI update
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, starred: nextStarred } : f)));
    if (nextStarred) {
      setStars((prev) => [...prev, { id: Date.now(), user_id: currentUser.id, file_id: fileId, created_at: new Date().toISOString() }]);
    } else {
      setStars((prev) => prev.filter((s) => s.file_id !== fileId));
    }

    try {
      const res = await apiClient.toggleStar(fileId, currentUser.id);
      if (res.starred !== nextStarred) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, starred: res.starred } : f)));
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      // Revert if error
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, starred: !nextStarred } : f)));
    }
  };

  // Real-time Sharing Actions
  const addShare = async (fileId: number, email: string, role: 'viewer' | 'editor'): Promise<Share> => {
    const created = await apiClient.createShare(fileId, email, role);
    setShares((prev) => [...prev, created]);
    return created;
  };

  const removeShare = async (shareId: number) => {
    await apiClient.deleteShare(shareId);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const getFileShares = (fileId: number) => {
    return shares.filter((s) => s.file_id === fileId);
  };

  const createLinkShare = async (
    fileId: number,
    options?: { expires_at?: string; password?: string }
  ): Promise<LinkShare> => {
    const created = await apiClient.createOrUpdateLinkShare(fileId, options);
    setLinkShares((prev) => {
      const idx = prev.findIndex((ls) => ls.file_id === fileId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = created;
        return copy;
      }
      return [...prev, created];
    });
    return created;
  };

  const removeLinkShare = async (linkShareId: number) => {
    await apiClient.deleteLinkShare(linkShareId);
    setLinkShares((prev) => prev.filter((ls) => ls.id !== linkShareId));
  };

  const getFileLinkShare = (fileId: number) => {
    return linkShares.find((ls) => ls.file_id === fileId);
  };

  const emptyTrash = async () => {
    const trashFiles = files.filter((f) => f.deleted_at !== null);
    const trashFolders = folders.filter((f) => f.deleted_at !== null);
    for (const f of trashFiles) {
      await apiClient.deleteFile(f.id, true).catch(() => {});
    }
    for (const fold of trashFolders) {
      await apiClient.deleteFolder(fold.id, true).catch(() => {});
    }
    setFolders((prev) => prev.filter((f) => f.deleted_at === null));
    setFiles((prev) => prev.filter((f) => f.deleted_at === null));
  };

  const setSort = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
  };

  return (
    <DriveContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        currentFolderId,
        setCurrentFolderId,
        breadcrumbs,
        viewMode,
        setViewMode,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        sortField,
        sortOrder,
        setSort,
        folders,
        files,
        currentFolders,
        currentFiles,
        allCurrentItemsCount: currentFolders.length + currentFiles.length,
        isLoading,
        refreshData,
        createFolder,
        renameFolder,
        deleteFolder,
        restoreFolder,
        permanentDeleteFolder,
        moveFolder,
        uploadFiles,
        isUploading,
        uploadProgress,
        uploadQueue,
        dismissUpload,
        renameFile,
        deleteFile,
        restoreFile,
        permanentDeleteFile,
        moveFile,
        toggleStar,
        shares,
        linkShares,
        stars,
        addShare,
        removeShare,
        getFileShares,
        createLinkShare,
        removeLinkShare,
        getFileLinkShare,
        storageUsedBytes,
        emptyTrash,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};
