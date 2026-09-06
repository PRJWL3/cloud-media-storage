export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Folder {
  id: number;
  name: string;
  owner_id: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FileItem {
  id: number;
  name: string;
  original_name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  owner_id: number;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  starred?: boolean;
  public_url?: string;
}

export interface Share {
  id: number;
  file_id: number;
  shared_with_user_id?: number;
  shared_with_email: string;
  role: 'viewer' | 'editor';
  created_at: string;
}

export interface LinkShare {
  id: number;
  file_id: number;
  token: string;
  expires_at: string | null;
  password_hash: string | null;
  has_password: boolean;
  created_at: string;
}

export interface Star {
  id: number;
  user_id: number;
  file_id: number;
  created_at: string;
}

export type DriveView = 'my-drive' | 'shared' | 'starred' | 'trash';

export type ViewMode = 'grid' | 'list';

export type SortField = 'name' | 'size' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export type FileFilterType = 'all' | 'image' | 'video' | 'audio' | 'document' | 'other';

export interface ActivityItem {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  details: string;
  file_id: number | null;
  folder_id: number | null;
  created_at: string;
}

export interface FileVersionItem {
  id: number;
  file_id: number;
  version_number: number;
  storage_path: string;
  size: number;
  mime_type: string;
  uploaded_by: number;
  uploader_name: string;
  created_at: string;
}

export interface PublicShareInfo {
  token: string;
  file_id: number;
  name: string;
  size: number;
  mime_type: string;
  owner_name: string;
  created_at: string;
  expires_at: string | null;
  is_expired: boolean;
  requires_password: boolean;
}

export interface UploadProgressItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  speed?: string;
  error?: string;
}

