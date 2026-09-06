# Cloud-Based Media Storage & File Management System

A production-grade, full-stack cloud media storage and sharing platform inspired by Google Drive, built with modern web technologies, real-time Supabase object storage, and PostgreSQL metadata persistence.

---

## 🌟 Key Features

### 1. File & Folder Hierarchy (Core MVP)
- **Folder CRUD**: Create, rename, move, soft-delete, and permanently delete folders with arbitrary nested depth.
- **File Management**: Upload, download, rename, move across folders, and soft-delete/restore files.
- **Search & Filter**: Real-time debounce search across all files and folders, with MIME-type filter chips (Images, Documents, Media, All).
- **Dual View Modes**: Seamless toggle between responsive Grid thumbnail cards and detailed List/Table view.
- **Trash & Recovery**: Two-stage deletion with Soft Delete (Trash view) and permanent deletion / single-click restoration.

### 2. Multi-Format In-App File Previews
- Instant high-fidelity modal previews without external downloads:
  - **Images**: PNG, JPG, GIF, WebP, SVG with responsive aspect ratio containment.
  - **Documents**: Embedded PDF iframe viewer.
  - **Video**: HTML5 video player with seek controls and full-screen support (MP4, WebM).
  - **Audio**: HTML5 audio player with scrub bar (MP3, WAV, OGG).
  - **Code & Text**: Plaintext and formatted code previews.

### 3. File Star & Favoriting
- One-click Star toggle with golden accent indicator (`#facc15`).
- Dedicated "Starred" view with instant filtering.
- Fully synchronized across previews, grid, and table views.

### 4. Authentication & User Management
- Secure user registration, login, session token validation, and logout.
- Cryptographic password hashing via **Bcrypt** and signed **JWT** access tokens.
- User profile switcher supporting multi-user simulation (`Prajwal`, `Sarah Chen`).

### 5. Role-Based Access Control (RBAC)
- Share files with collaborators via email with granular roles:
  - **Viewer**: Read-only permissions (preview and download). Modifying, renaming, or deleting raises `HTTP 403 Forbidden`.
  - **Editor**: Full read/write permissions (preview, download, rename, move, update, delete).
- Real-time client-side UI enforcement and server-side authorization checks.

### 6. File Version History
- Automatic version archiving whenever a file with the same name is uploaded.
- Dedicated **Version History Modal** displaying version number (`v1`, `v2`, ...), uploader name, archive timestamp, and file size.
- Direct download of any historical version snapshot.

### 7. Activity Log & Audit Trail
- Automated event logging for key operations: file uploads, version creation, renames, moves, soft/permanent deletions, restores, user shares, and public link generation.
- Slide-over **Activity Drawer** with relative timestamps, action-specific icons, and user attribution.

### 8. Public Shareable Links
- Generate unique public tokens (`/s/{token}`) with optional **password protection** and **expiration dates**.
- Dedicated public landing page with:
  - Automatic expiration check (shows clear warning when expired).
  - Password unlock form when protected.
  - Inline preview and direct download button.

### 9. Docked Upload Progress Widget
- Bottom-right corner floating toast/widget during uploads.
- Real-time progress percentage, file size formatting, spinner animation, success checks, and dismiss controls.

---

## 🛠️ Architecture & Tech Stack

```
Frontend (React 19 + TypeScript + Vite)
      │
      │ REST API (Bearer JWT)
      ▼
Backend (FastAPI + SQLAlchemy + Pydantic)
   ┌──┴────────────────────────┐
   ▼                           ▼
PostgreSQL Database     Supabase Storage
(Metadata, Shares,      ("media-files" bucket,
 Versions, Audit Logs)   Raw media binaries)
```

- **Frontend**: React 19, TypeScript, Vite, Lucide React, CSS Variables (Strict Monochromatic Dark/Light).
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0, Pydantic, Bcrypt, PyJWT, Psycopg2.
- **Database**: PostgreSQL with relational cascade deletion and indexing.
- **Storage**: Live Supabase Object Storage (`media-files` bucket).

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL database instance (or Supabase Postgres)
- Supabase Project with a public/authenticated storage bucket named `media-files`

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables in backend/.env:
# SUPABASE_URL=https://<your-project>.supabase.co
# SUPABASE_KEY=<your-service-or-anon-key>
# DATABASE_URL=postgresql://user:password@host:port/dbname
# JWT_SECRET=<your-32-byte-secret>

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

FastAPI server runs at `http://127.0.0.1:8000`. Interactive Swagger API docs are available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Run Vite development server
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## 🌐 Production Deployment

### Frontend (Vercel)
The frontend contains `frontend/vercel.json` configured with SPA fallback routing so public share links (`/s/:token`) route correctly:
```bash
cd frontend
vercel
```

### Backend (Render / Docker)
The backend includes `backend/Dockerfile` and `backend/render.yaml` for containerized or blueprint deployment.
Set the following Environment Variables on your hosting provider:
- `DATABASE_URL`: Connection string for PostgreSQL.
- `SUPABASE_URL`: Your Supabase API endpoint.
- `SUPABASE_KEY`: Supabase service role or anon key.
- `JWT_SECRET`: Random 32+ character string.

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and obtain JWT token |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/folders` | List folders (supports `include_trash`) |
| `POST` | `/api/folders` | Create new folder |
| `PATCH`| `/api/folders/{id}` | Rename or move folder |
| `DELETE`| `/api/folders/{id}` | Soft or permanent delete folder |
| `GET` | `/api/files` | List files with metadata & star status |
| `POST` | `/api/upload` | Upload file (archives version if duplicate) |
| `GET` | `/api/files/{id}/view` | Stream inline preview of file |
| `GET` | `/api/files/{id}/download` | Download file with attachment header |
| `PATCH`| `/api/files/{id}` | Update file (RBAC editor required) |
| `DELETE`| `/api/files/{id}` | Delete file (RBAC editor required) |
| `POST` | `/api/files/{id}/star` | Toggle star on file |
| `GET` | `/api/files/{id}/versions` | Get version history for file |
| `GET` | `/api/files/{id}/versions/{v_id}/download` | Download historical version |
| `GET` | `/api/shares` | List user shares |
| `POST` | `/api/files/{id}/shares` | Share file with user email (viewer/editor) |
| `POST` | `/api/files/{id}/link-share` | Create/update public share link |
| `GET` | `/api/public/shares/{token}` | Public link metadata & expiry status |
| `POST` | `/api/public/shares/{token}/verify` | Verify password for public link |
| `GET` | `/api/public/shares/{token}/view` | Public file inline preview |
| `GET` | `/api/public/shares/{token}/download` | Public file download |
| `GET` | `/api/activities` | Audit trail and event logs |
