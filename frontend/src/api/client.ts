import type { FileItem, Folder, Share, LinkShare, Star, User, ActivityItem, FileVersionItem, PublicShareInfo } from '../types/drive';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
    : 'http://127.0.0.1:8000/api');

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('drive_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiClient = {
  // Auth & Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed. Please check credentials.');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('drive_access_token', data.access_token);
    }
    return data;
  },

  async register(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed. Please check your details.');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('drive_access_token', data.access_token);
    }
    return data;
  },

  async getMe(tokenOverride?: string): Promise<User> {
    const token = tokenOverride || localStorage.getItem('drive_access_token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/auth/me`, { headers });
    if (!res.ok) throw new Error('Failed to fetch authenticated user profile');
    return res.json();
  },

  async logout(): Promise<void> {
    localStorage.removeItem('drive_access_token');
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  },

  async createUser(name: string, email: string, password = 'password123'): Promise<User> {
    const data = await this.register(name, email, password);
    return data.user;
  },

  // Folders
  async getFolders(ownerId = 1): Promise<Folder[]> {
    const res = await fetch(`${API_BASE}/folders?owner_id=${ownerId}&include_trash=true`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch folders');
    return res.json();
  },

  async createFolder(name: string, parentId: number | null = null, ownerId = 1): Promise<Folder> {
    const res = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ name, parent_id: parentId, owner_id: ownerId }),
    });
    if (!res.ok) throw new Error('Failed to create folder');
    return res.json();
  },

  async updateFolder(id: number, data: { name?: string; parent_id?: number | null }): Promise<Folder> {
    const res = await fetch(`${API_BASE}/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update folder');
    return res.json();
  },

  async deleteFolder(id: number, permanent = false): Promise<void> {
    const res = await fetch(`${API_BASE}/folders/${id}?permanent=${permanent}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to delete folder');
  },

  async restoreFolder(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/folders/${id}/restore`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to restore folder');
  },

  // Files
  async getFiles(userId = 1): Promise<FileItem[]> {
    const res = await fetch(`${API_BASE}/files?user_id=${userId}&include_trash=true`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  },

  async uploadFile(file: File, ownerId = 1, folderId: number | null = null): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('owner_id', String(ownerId));
    if (folderId !== null) {
      formData.append('folder_id', String(folderId));
    }

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload file');
    }
    const data = await res.json();
    return data.file;
  },

  async updateFile(id: number, data: { name?: string; folder_id?: number | null }): Promise<FileItem> {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update file');
    }
    return res.json();
  },

  async deleteFile(id: number, permanent = false): Promise<void> {
    const res = await fetch(`${API_BASE}/files/${id}?permanent=${permanent}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete file');
    }
  },

  async restoreFile(id: number): Promise<FileItem> {
    const res = await fetch(`${API_BASE}/files/${id}/restore`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to restore file');
    }
    return res.json();
  },

  async toggleStar(id: number, userId = 1): Promise<{ file_id: number; starred: boolean }> {
    const res = await fetch(`${API_BASE}/files/${id}/star?user_id=${userId}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to toggle star');
    return res.json();
  },

  // Shares
  async getShares(): Promise<Share[]> {
    const res = await fetch(`${API_BASE}/shares`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch shares');
    return res.json();
  },

  async createShare(fileId: number, email: string, role: 'viewer' | 'editor'): Promise<Share> {
    const res = await fetch(`${API_BASE}/files/${fileId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create share');
    }
    return res.json();
  },

  async deleteShare(shareId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/shares/${shareId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to delete share');
  },

  // Link Shares
  async getLinkShares(): Promise<LinkShare[]> {
    const res = await fetch(`${API_BASE}/link-shares`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch link shares');
    return res.json();
  },

  async createOrUpdateLinkShare(
    fileId: number,
    options?: { expires_at?: string; password?: string }
  ): Promise<LinkShare> {
    const res = await fetch(`${API_BASE}/files/${fileId}/link-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to create link share');
    return res.json();
  },

  async deleteLinkShare(linkShareId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/link-shares/${linkShareId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to delete link share');
  },

  // Stars
  async getStars(userId = 1): Promise<Star[]> {
    const res = await fetch(`${API_BASE}/stars?user_id=${userId}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch stars');
    return res.json();
  },

  // Activities
  async getActivities(userId?: number): Promise<ActivityItem[]> {
    const url = userId ? `${API_BASE}/activities?user_id=${userId}` : `${API_BASE}/activities`;
    const res = await fetch(url, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch activities');
    return res.json();
  },

  // File Versions
  async getFileVersions(fileId: number): Promise<FileVersionItem[]> {
    const res = await fetch(`${API_BASE}/files/${fileId}/versions`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch file versions');
    return res.json();
  },

  getFileVersionDownloadUrl(fileId: number, versionId: number): string {
    return `${API_BASE}/files/${fileId}/versions/${versionId}/download`;
  },

  // Public Shares
  async getPublicShare(token: string): Promise<PublicShareInfo> {
    const res = await fetch(`${API_BASE}/public/shares/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Public share link not found or invalid');
    }
    return res.json();
  },

  async verifyPublicShare(token: string, password?: string): Promise<{ valid: boolean; access_pass?: string }> {
    const res = await fetch(`${API_BASE}/public/shares/${token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password || '' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Incorrect password');
    }
    return res.json();
  },

  getPublicShareViewUrl(token: string, accessPass?: string, password?: string): string {
    const params = new URLSearchParams();
    if (accessPass) params.set('access_pass', accessPass);
    if (password) params.set('password', password);
    const qs = params.toString();
    return `${API_BASE}/public/shares/${token}/view${qs ? `?${qs}` : ''}`;
  },

  getPublicShareDownloadUrl(token: string, accessPass?: string, password?: string): string {
    const params = new URLSearchParams();
    if (accessPass) params.set('access_pass', accessPass);
    if (password) params.set('password', password);
    const qs = params.toString();
    return `${API_BASE}/public/shares/${token}/download${qs ? `?${qs}` : ''}`;
  },
};

