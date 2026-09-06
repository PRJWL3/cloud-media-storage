import os
import mimetypes
from datetime import datetime, timedelta
from typing import Optional, List
import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Query, Form, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from supabase import create_client, Client

from app.database import Base, engine, get_db
from app.models import User, Folder, FileModel, Share, LinkShare, Star, Activity, FileVersion

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set!")
supabase: Client = create_client(supabase_url, supabase_key)

BUCKET_NAME = "media-files"

app = FastAPI(title="Cloud Media Storage API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def init_db_and_sync_bucket():
    """Seed initial user and sync existing Supabase bucket files into PostgreSQL"""
    db = next(get_db())
    try:
        # 1. Ensure primary user exists
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(
                id=1,
                name="Prajwal",
                email="prajwal@cloudstorage.io",
                password_hash="demo_hashed_password",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()

        # Also add a second user for testing collaboration
        user2 = db.query(User).filter(User.email == "sarah.chen@techcorp.com").first()
        if not user2:
            user2 = User(
                id=2,
                name="Sarah Chen",
                email="sarah.chen@techcorp.com",
                password_hash="demo_hashed_password",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user2)
            db.commit()

        # 2. Sync files from Supabase bucket
        try:
            bucket_items = supabase.storage.from_(BUCKET_NAME).list()
            existing_file_names = set(
                row[0] for row in db.query(FileModel.name).all()
            )

            for item in bucket_items:
                fname = item.get("name")
                if not fname or fname in existing_file_names or fname.startswith("."):
                    continue

                meta = item.get("metadata") or {}
                size = meta.get("size") or meta.get("contentLength") or 0
                mime = meta.get("mimetype")
                if not mime or mime == "text/plain":
                    guessed_mime, _ = mimetypes.guess_type(fname)
                    mime = guessed_mime or mime or "application/octet-stream"

                new_file = FileModel(
                    name=fname,
                    original_name=fname,
                    size=int(size),
                    mime_type=mime,
                    storage_path=f"{BUCKET_NAME}/{fname}",
                    owner_id=1,
                    folder_id=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    deleted_at=None,
                )
                db.add(new_file)
                existing_file_names.add(fname)

            db.commit()
        except Exception as e:
            print("Supabase bucket sync warning:", e)
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    init_db_and_sync_bucket()


def file_to_response(file_model: FileModel, db: Session, user_id: int = 1) -> dict:
    is_starred = db.query(Star).filter(
        Star.file_id == file_model.id,
        Star.user_id == user_id
    ).first() is not None

    public_url = f"http://127.0.0.1:8000/api/files/{file_model.id}/view"

    return {
        "id": file_model.id,
        "name": file_model.name,
        "original_name": file_model.original_name,
        "size": file_model.size,
        "mime_type": file_model.mime_type,
        "storage_path": file_model.storage_path,
        "owner_id": file_model.owner_id,
        "folder_id": file_model.folder_id,
        "created_at": file_model.created_at.isoformat() if file_model.created_at else None,
        "updated_at": file_model.updated_at.isoformat() if file_model.updated_at else None,
        "deleted_at": file_model.deleted_at.isoformat() if file_model.deleted_at else None,
        "starred": is_starred,
        "public_url": public_url,
    }


# ==============================================================================
# Health & Status
# ==============================================================================
@app.get("/")
def home():
    return {"message": "Cloud storage API", "status": "online", "bucket": BUCKET_NAME}


# ==============================================================================
# Auth & Security Helpers
# ==============================================================================
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-cloud-media-storage-production-32bytes")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return True
    if hashed_password in ("demo_hashed_password", "demo_password"):
        # Backward compatibility for initial seeded demo accounts
        return True
    if hashed_password.startswith("hashed_"):
        return hashed_password == f"hashed_{plain_password}"
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_jwt_token(user_id: int, email: str, name: str) -> str:
    expires_delta = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    expire = datetime.utcnow() + expires_delta
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def get_current_user_id(authorization: Optional[str] = Header(None), user_id: Optional[int] = Query(None)) -> int:
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        payload = decode_jwt_token(token)
        if payload and "sub" in payload:
            return int(payload["sub"])
    if user_id is not None:
        return user_id
    return 1


def check_file_permission(file: FileModel, user_id: int, required_role: str, db: Session):
    """
    Enforces server-side Role-Based Access Control (RBAC):
    - Owner: full permissions (viewer + editor).
    - Editor: preview, download, rename, move, delete.
    - Viewer: preview, download only. Modifying/deleting raises HTTP 403.
    """
    if file.owner_id == user_id:
        return True

    user = db.query(User).filter(User.id == user_id).first()
    user_email = user.email.lower() if user else ""

    share = db.query(Share).filter(
        Share.file_id == file.id,
        or_(
            Share.shared_with_user_id == user_id,
            Share.shared_with_email.ilike(user_email)
        )
    ).first()

    if not share:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You do not have permission to access this file."
        )

    if required_role == "editor" and share.role == "viewer":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Viewer role does not have permission to modify or delete this file."
        )

    return True


def log_activity(
    db: Session,
    user_id: int,
    action: str,
    details: str,
    file_id: Optional[int] = None,
    folder_id: Optional[int] = None
):
    try:
        activity = Activity(
            user_id=user_id,
            action=action,
            details=details,
            file_id=file_id,
            folder_id=folder_id,
            created_at=datetime.utcnow()
        )
        db.add(activity)
        db.commit()
    except Exception as e:
        print(f"Failed to log activity: {e}")
        db.rollback()



# ==============================================================================
# Users & Auth API
# ==============================================================================
@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@app.post("/api/auth/register")
@app.post("/auth/register")
@app.post("/api/users")
def register_user(data: dict, db: Session = Depends(get_db)):
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or "password123"

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed = hash_password(password)
    user = User(
        name=name,
        email=email,
        password_hash=hashed,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_jwt_token(user.id, user.email, user.name)
    user_res = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": user_res,
    }


@app.post("/api/auth/login")
@app.post("/auth/login")
def auth_login(data: dict, db: Session = Depends(get_db)):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # If demo seed password was used, upgrade it to bcrypt
    if user.password_hash in ("demo_hashed_password", "demo_password"):
        user.password_hash = hash_password(password)
        db.commit()

    token = create_jwt_token(user.id, user.email, user.name)
    user_res = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": user_res,
    }


@app.get("/api/auth/me")
@app.get("/auth/me")
def auth_me(
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    target_user_id: Optional[int] = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        payload = decode_jwt_token(token)
        if payload and "sub" in payload:
            target_user_id = int(payload["sub"])

    if target_user_id is None and user_id is not None:
        target_user_id = user_id

    if target_user_id is None:
        target_user_id = 1

    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@app.post("/api/auth/logout")
@app.post("/auth/logout")
def auth_logout():
    return {"status": "success", "message": "Successfully logged out"}


# ==============================================================================
# Folders API
# ==============================================================================
@app.get("/api/folders")
def list_folders(
    owner_id: int = 1,
    include_trash: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Folder).filter(Folder.owner_id == owner_id)
    if not include_trash:
        query = query.filter(Folder.deleted_at.is_(None))
    folders = query.all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "owner_id": f.owner_id,
            "parent_id": f.parent_id,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            "deleted_at": f.deleted_at.isoformat() if f.deleted_at else None,
        }
        for f in folders
    ]


@app.post("/api/folders")
def create_folder(
    data: dict,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    name = data.get("name", "").strip()
    parent_id = data.get("parent_id")
    owner_id = data.get("owner_id")
    if not owner_id:
        owner_id = get_current_user_id(authorization, user_id)

    if not name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    folder = Folder(
        name=name,
        owner_id=owner_id,
        parent_id=parent_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        deleted_at=None,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    log_activity(db, owner_id, "create_folder", f"Created folder '{folder.name}'", folder_id=folder.id)

    return {
        "id": folder.id,
        "name": folder.name,
        "owner_id": folder.owner_id,
        "parent_id": folder.parent_id,
        "created_at": folder.created_at.isoformat() if folder.created_at else None,
        "updated_at": folder.updated_at.isoformat() if folder.updated_at else None,
        "deleted_at": None,
    }


@app.patch("/api/folders/{id}")
def update_folder(
    id: int,
    data: dict,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(Folder.id == id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    uid = get_current_user_id(authorization, user_id)
    old_name = folder.name
    if "name" in data and data["name"].strip():
        folder.name = data["name"].strip()
    if "parent_id" in data:
        folder.parent_id = data["parent_id"]

    folder.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(folder)
    log_activity(db, uid, "update_folder", f"Renamed folder '{old_name}' -> '{folder.name}'", folder_id=folder.id)
    return folder


@app.delete("/api/folders/{id}")
def delete_folder(
    id: int,
    permanent: bool = False,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(Folder.id == id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    uid = get_current_user_id(authorization, user_id)
    folder_name = folder.name
    if permanent:
        db.delete(folder)
        log_activity(db, uid, "permanent_delete_folder", f"Permanently deleted folder '{folder_name}'")
    else:
        folder.deleted_at = datetime.utcnow()
        log_activity(db, uid, "delete_folder", f"Moved folder '{folder_name}' to trash", folder_id=id)

    db.commit()
    return {"status": "success", "id": id, "permanent": permanent}


@app.post("/api/folders/{id}/restore")
def restore_folder(
    id: int,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(Folder.id == id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    uid = get_current_user_id(authorization, user_id)
    folder.deleted_at = None
    folder.updated_at = datetime.utcnow()
    db.commit()
    log_activity(db, uid, "restore_folder", f"Restored folder '{folder.name}'", folder_id=id)
    return {"status": "success", "id": id}


# ==============================================================================
# Files API
# ==============================================================================
@app.get("/api/files")
def list_files(
    user_id: int = 1,
    include_trash: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(FileModel)
    if not include_trash:
        query = query.filter(FileModel.deleted_at.is_(None))

    files = query.all()
    return [file_to_response(f, db, user_id) for f in files]


# Legacy endpoint support
@app.get("/files")
def legacy_list_files(db: Session = Depends(get_db)):
    files = db.query(FileModel).filter(FileModel.deleted_at.is_(None)).all()
    return {"files": [file_to_response(f, db) for f in files]}


@app.get("/api/files/{id}/view")
def view_file(id: int, db: Session = Depends(get_db)):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Resolve storage path in Supabase bucket
        storage_key = file.original_name or file.name
        if file.storage_path:
            sp = file.storage_path
            if sp.startswith(f"{BUCKET_NAME}/"):
                sp = sp[len(BUCKET_NAME) + 1:]
            if sp:
                storage_key = sp

        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_key)
        except Exception:
            data = supabase.storage.from_(BUCKET_NAME).download(file.name)

        mime = file.mime_type or "application/octet-stream"
        return Response(
            content=data,
            media_type=mime,
            headers={
                "Content-Disposition": f'inline; filename="{file.name}"',
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
                "Cross-Origin-Resource-Policy": "cross-origin",
                "Accept-Ranges": "bytes",
            }
        )
    except Exception as e:
        print(f"Error serving file {file.name}:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/{id}/download")
def download_file(id: int, db: Session = Depends(get_db)):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        storage_key = file.original_name or file.name
        if file.storage_path:
            sp = file.storage_path
            if sp.startswith(f"{BUCKET_NAME}/"):
                sp = sp[len(BUCKET_NAME) + 1:]
            if sp:
                storage_key = sp

        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_key)
        except Exception:
            data = supabase.storage.from_(BUCKET_NAME).download(file.name)

        mime = file.mime_type or "application/octet-stream"
        return Response(
            content=data,
            media_type=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{file.name}"',
                "Access-Control-Allow-Origin": "*",
                "Cross-Origin-Resource-Policy": "cross-origin",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
@app.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    owner_id: int = Form(1),
    folder_id: Optional[int] = Form(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not owner_id or owner_id == 1:
        owner_id = get_current_user_id(authorization, owner_id)

    # Read content
    content = file.file.read()
    filename = file.filename

    # Guess MIME type
    mime_type = file.content_type
    if not mime_type or mime_type == "application/octet-stream":
        guessed, _ = mimetypes.guess_type(filename)
        mime_type = guessed or mime_type or "application/octet-stream"

    # Save to PostgreSQL and handle versioning
    existing_file = db.query(FileModel).filter(
        FileModel.name == filename,
        FileModel.owner_id == owner_id,
        FileModel.folder_id == folder_id
    ).first()

    if existing_file:
        # Check permissions if someone other than owner is updating
        check_file_permission(existing_file, owner_id, "editor", db)

        # Archive current state into FileVersion
        v_count = db.query(FileVersion).filter(FileVersion.file_id == existing_file.id).count()
        next_v_num = v_count + 1

        archived_storage_path = f"versions/{existing_file.id}_v{next_v_num}_{existing_file.name}"
        try:
            old_storage_key = existing_file.original_name or existing_file.name
            if existing_file.storage_path and existing_file.storage_path.startswith(f"{BUCKET_NAME}/"):
                old_storage_key = existing_file.storage_path[len(BUCKET_NAME) + 1:]
            try:
                old_data = supabase.storage.from_(BUCKET_NAME).download(old_storage_key)
            except Exception:
                old_data = supabase.storage.from_(BUCKET_NAME).download(existing_file.name)
            supabase.storage.from_(BUCKET_NAME).upload(archived_storage_path, old_data, file_options={"upsert": "true"})
        except Exception as e:
            print("Failed to archive old version to Supabase:", e)
            archived_storage_path = existing_file.storage_path or f"{BUCKET_NAME}/{existing_file.name}"

        archived_version = FileVersion(
            file_id=existing_file.id,
            version_number=next_v_num,
            storage_path=archived_storage_path,
            size=existing_file.size,
            mime_type=existing_file.mime_type,
            uploaded_by=existing_file.owner_id,
            created_at=existing_file.updated_at or existing_file.created_at,
        )
        db.add(archived_version)

        # Upload new content to Supabase Storage
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                filename,
                content,
                file_options={"upsert": "true"}
            )
        except Exception as e:
            print("Supabase upload exception:", e)

        existing_file.size = len(content)
        existing_file.mime_type = mime_type
        existing_file.storage_path = f"{BUCKET_NAME}/{filename}"
        existing_file.updated_at = datetime.utcnow()
        existing_file.deleted_at = None
        db.commit()
        db.refresh(existing_file)
        target_file = existing_file

        log_activity(db, owner_id, "version_create", f"Archived version {next_v_num} and updated '{filename}' (v{next_v_num + 1})", file_id=target_file.id, folder_id=folder_id)
    else:
        # Upload new content to Supabase Storage
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                filename,
                content,
                file_options={"upsert": "true"}
            )
        except Exception as e:
            print("Supabase upload exception:", e)

        new_file = FileModel(
            name=filename,
            original_name=filename,
            size=len(content),
            mime_type=mime_type,
            storage_path=f"{BUCKET_NAME}/{filename}",
            owner_id=owner_id,
            folder_id=folder_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            deleted_at=None,
        )
        db.add(new_file)
        db.commit()
        db.refresh(new_file)
        target_file = new_file

        size_kb = round(len(content) / 1024, 1)
        log_activity(db, owner_id, "upload", f"Uploaded file '{filename}' ({size_kb} KB)", file_id=target_file.id, folder_id=folder_id)

    res = file_to_response(target_file, db, owner_id)
    return {"status": "success", "file": res}


@app.patch("/api/files/{id}")
def update_file(
    id: int,
    data: dict,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    uid = get_current_user_id(authorization, user_id)
    check_file_permission(file, uid, "editor", db)

    old_name = file.name
    if "name" in data and data["name"].strip():
        file.name = data["name"].strip()
    if "folder_id" in data:
        file.folder_id = data["folder_id"]

    file.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(file)
    action = "rename" if file.name != old_name else "move"
    log_activity(db, uid, action, f"Updated file '{old_name}' -> '{file.name}'", file_id=file.id)
    return file_to_response(file, db, uid)


@app.delete("/api/files/{id}")
def delete_file(
    id: int,
    permanent: bool = False,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    uid = get_current_user_id(authorization, user_id)
    check_file_permission(file, uid, "editor", db)

    file_name = file.name
    if permanent:
        try:
            supabase.storage.from_(BUCKET_NAME).remove([file.name])
        except Exception as e:
            print("Error deleting from bucket:", e)
        db.delete(file)
        log_activity(db, uid, "permanent_delete", f"Permanently deleted file '{file_name}'")
    else:
        file.deleted_at = datetime.utcnow()
        log_activity(db, uid, "delete", f"Moved file '{file_name}' to trash", file_id=id)

    db.commit()
    return {"status": "success", "id": id, "permanent": permanent}


@app.post("/api/files/{id}/restore")
def restore_file(
    id: int,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    uid = get_current_user_id(authorization, user_id)
    check_file_permission(file, uid, "editor", db)

    file.deleted_at = None
    file.updated_at = datetime.utcnow()
    db.commit()
    log_activity(db, uid, "restore", f"Restored file '{file.name}' from trash", file_id=id)
    return file_to_response(file, db, uid)


# ==============================================================================
# File Versions API
# ==============================================================================
@app.get("/api/files/{id}/versions")
def get_file_versions(
    id: int,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    uid = get_current_user_id(authorization, user_id)
    check_file_permission(file, uid, "viewer", db)

    versions = db.query(FileVersion, User.name.label("uploader_name"))\
        .join(User, FileVersion.uploaded_by == User.id, isouter=True)\
        .filter(FileVersion.file_id == id)\
        .order_by(FileVersion.version_number.desc())\
        .all()

    return [
        {
            "id": v.id,
            "file_id": v.file_id,
            "version_number": v.version_number,
            "storage_path": v.storage_path,
            "size": v.size,
            "mime_type": v.mime_type,
            "uploaded_by": v.uploaded_by,
            "uploader_name": uploader_name or "Unknown",
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v, uploader_name in versions
    ]


@app.get("/api/files/{id}/versions/{version_id}/download")
def download_file_version(
    id: int,
    version_id: int,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(FileModel.id == id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    uid = get_current_user_id(authorization, user_id)
    check_file_permission(file, uid, "viewer", db)

    version = db.query(FileVersion).filter(FileVersion.id == version_id, FileVersion.file_id == id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    try:
        storage_key = version.storage_path
        if storage_key.startswith(f"{BUCKET_NAME}/"):
            storage_key = storage_key[len(BUCKET_NAME) + 1:]

        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_key)
        except Exception:
            data = supabase.storage.from_(BUCKET_NAME).download(file.name)

        mime = version.mime_type or "application/octet-stream"
        filename_v = f"v{version.version_number}_{file.name}"
        return Response(
            content=data,
            media_type=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{filename_v}"',
                "Access-Control-Allow-Origin": "*",
                "Cross-Origin-Resource-Policy": "cross-origin",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/files/{id}/star")
def toggle_star(id: int, user_id: int = Query(1), db: Session = Depends(get_db)):
    existing_stars = db.query(Star).filter(
        Star.file_id == id,
        Star.user_id == user_id
    ).all()

    if existing_stars:
        for s in existing_stars:
            db.delete(s)
        db.commit()
        return {"file_id": id, "starred": False}
    else:
        new_star = Star(
            user_id=user_id,
            file_id=id,
            created_at=datetime.utcnow()
        )
        db.add(new_star)
        db.commit()
        return {"file_id": id, "starred": True}


# ==============================================================================
# Shares API (SHARES & LINK_SHARES)
# ==============================================================================
@app.get("/api/shares")
def list_all_shares(db: Session = Depends(get_db)):
    shares = db.query(Share).all()
    return [
        {
            "id": s.id,
            "file_id": s.file_id,
            "shared_with_email": s.shared_with_email,
            "shared_with_user_id": s.shared_with_user_id,
            "role": s.role,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in shares
    ]


@app.get("/api/files/{id}/shares")
def get_file_shares(id: int, db: Session = Depends(get_db)):
    shares = db.query(Share).filter(Share.file_id == id).all()
    return [
        {
            "id": s.id,
            "file_id": s.file_id,
            "shared_with_email": s.shared_with_email,
            "shared_with_user_id": s.shared_with_user_id,
            "role": s.role,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in shares
    ]


@app.post("/api/files/{id}/shares")
def create_file_share(
    id: int,
    data: dict,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    email = data.get("email", "").strip().lower()
    role = data.get("role", "viewer")
    uid = get_current_user_id(authorization, user_id)

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Find user if registered
    target_user = db.query(User).filter(User.email == email).first()

    share = Share(
        file_id=id,
        shared_with_email=email,
        shared_with_user_id=target_user.id if target_user else None,
        role=role,
        created_at=datetime.utcnow(),
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    log_activity(db, uid, "share", f"Shared file #{id} with '{email}' as {role}", file_id=id)
    return {
        "id": share.id,
        "file_id": share.file_id,
        "shared_with_email": share.shared_with_email,
        "shared_with_user_id": share.shared_with_user_id,
        "role": share.role,
        "created_at": share.created_at.isoformat(),
    }


@app.delete("/api/shares/{id}")
def delete_share(id: int, authorization: Optional[str] = Header(None), user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    share = db.query(Share).filter(Share.id == id).first()
    if share:
        uid = get_current_user_id(authorization, user_id)
        log_activity(db, uid, "unshare", f"Removed share permission for '{share.shared_with_email}'", file_id=share.file_id)
        db.delete(share)
        db.commit()
    return {"status": "success", "id": id}


@app.get("/api/link-shares")
def list_link_shares(db: Session = Depends(get_db)):
    links = db.query(LinkShare).all()
    return [
        {
            "id": ls.id,
            "file_id": ls.file_id,
            "token": ls.token,
            "expires_at": ls.expires_at.isoformat() if ls.expires_at else None,
            "has_password": bool(ls.password_hash),
            "created_at": ls.created_at.isoformat() if ls.created_at else None,
        }
        for ls in links
    ]


@app.post("/api/files/{id}/link-share")
def create_or_update_link_share(
    id: int,
    data: dict,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    uid = get_current_user_id(authorization, user_id)
    existing = db.query(LinkShare).filter(LinkShare.file_id == id).first()
    expires_str = data.get("expires_at")
    expires_at = datetime.fromisoformat(expires_str) if expires_str else None
    password = data.get("password")

    if existing:
        if "expires_at" in data:
            existing.expires_at = expires_at
        if password is not None:
            existing.password_hash = hash_password(password) if password else None
        db.commit()
        db.refresh(existing)
        link = existing
    else:
        import uuid
        token = f"share_{uuid.uuid4().hex[:10]}"
        link = LinkShare(
            file_id=id,
            token=token,
            expires_at=expires_at,
            password_hash=hash_password(password) if password else None,
            created_at=datetime.utcnow(),
        )
        db.add(link)
        db.commit()
        db.refresh(link)

    log_activity(db, uid, "link_share", f"Generated public share link ({link.token}) for file #{id}", file_id=id)

    return {
        "id": link.id,
        "file_id": link.file_id,
        "token": link.token,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "has_password": bool(link.password_hash),
        "created_at": link.created_at.isoformat(),
    }


@app.delete("/api/link-shares/{id}")
def delete_link_share(id: int, db: Session = Depends(get_db)):
    link = db.query(LinkShare).filter(LinkShare.id == id).first()
    if link:
        db.delete(link)
        db.commit()
    return {"status": "success", "id": id}


# ==============================================================================
# Public Share Endpoints (/api/public/shares/...)
# ==============================================================================
@app.get("/api/public/shares/{token}")
def get_public_share(token: str, db: Session = Depends(get_db)):
    link = db.query(LinkShare).filter(LinkShare.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Public share link not found or invalid.")

    is_expired = False
    if link.expires_at and link.expires_at < datetime.utcnow():
        is_expired = True

    file = db.query(FileModel).filter(FileModel.id == link.file_id).first()
    if not file or file.deleted_at:
        raise HTTPException(status_code=404, detail="The shared file is no longer available.")

    owner = db.query(User).filter(User.id == file.owner_id).first()

    return {
        "token": link.token,
        "file_id": file.id,
        "name": file.name,
        "size": file.size,
        "mime_type": file.mime_type,
        "owner_name": owner.name if owner else "Cloud User",
        "created_at": file.created_at.isoformat() if file.created_at else None,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "is_expired": is_expired,
        "requires_password": bool(link.password_hash),
    }


@app.post("/api/public/shares/{token}/verify")
def verify_public_share_password(token: str, data: dict, db: Session = Depends(get_db)):
    link = db.query(LinkShare).filter(LinkShare.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This share link has expired")

    password = data.get("password", "")
    if not link.password_hash:
        return {"valid": True, "message": "No password required"}

    if not verify_password(password, link.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    auth_pass = create_jwt_token(user_id=0, email=f"link_{token}", name=f"share_{token}")
    return {"valid": True, "access_pass": auth_pass}


@app.get("/api/public/shares/{token}/view")
def view_public_share_file(
    token: str,
    password: Optional[str] = Query(None),
    access_pass: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    link = db.query(LinkShare).filter(LinkShare.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This share link has expired")

    if link.password_hash:
        verified = False
        if access_pass and decode_jwt_token(access_pass):
            verified = True
        elif password and verify_password(password, link.password_hash):
            verified = True
        if not verified:
            raise HTTPException(status_code=401, detail="Password verification required to view this file")

    file = db.query(FileModel).filter(FileModel.id == link.file_id).first()
    if not file or file.deleted_at:
        raise HTTPException(status_code=404, detail="Shared file not found")

    try:
        storage_key = file.original_name or file.name
        if file.storage_path:
            sp = file.storage_path
            if sp.startswith(f"{BUCKET_NAME}/"):
                sp = sp[len(BUCKET_NAME) + 1:]
            if sp:
                storage_key = sp

        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_key)
        except Exception:
            data = supabase.storage.from_(BUCKET_NAME).download(file.name)

        mime = file.mime_type or "application/octet-stream"
        return Response(
            content=data,
            media_type=mime,
            headers={
                "Content-Disposition": f'inline; filename="{file.name}"',
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
                "Cross-Origin-Resource-Policy": "cross-origin",
                "Accept-Ranges": "bytes",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/shares/{token}/download")
def download_public_share_file(
    token: str,
    password: Optional[str] = Query(None),
    access_pass: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    link = db.query(LinkShare).filter(LinkShare.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This share link has expired")

    if link.password_hash:
        verified = False
        if access_pass and decode_jwt_token(access_pass):
            verified = True
        elif password and verify_password(password, link.password_hash):
            verified = True
        if not verified:
            raise HTTPException(status_code=401, detail="Password verification required to download this file")

    file = db.query(FileModel).filter(FileModel.id == link.file_id).first()
    if not file or file.deleted_at:
        raise HTTPException(status_code=404, detail="Shared file not found")

    try:
        storage_key = file.original_name or file.name
        if file.storage_path:
            sp = file.storage_path
            if sp.startswith(f"{BUCKET_NAME}/"):
                sp = sp[len(BUCKET_NAME) + 1:]
            if sp:
                storage_key = sp

        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_key)
        except Exception:
            data = supabase.storage.from_(BUCKET_NAME).download(file.name)

        mime = file.mime_type or "application/octet-stream"
        return Response(
            content=data,
            media_type=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{file.name}"',
                "Access-Control-Allow-Origin": "*",
                "Cross-Origin-Resource-Policy": "cross-origin",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# Activity Logging API
# ==============================================================================
@app.get("/api/activities")
def get_activities(
    user_id: Optional[int] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    query = db.query(Activity, User.name.label("user_name"), User.email.label("user_email"))\
        .join(User, Activity.user_id == User.id, isouter=True)

    if user_id:
        query = query.filter(Activity.user_id == user_id)

    records = query.order_by(Activity.created_at.desc()).limit(limit).all()

    return [
        {
            "id": act.id,
            "user_id": act.user_id,
            "user_name": user_name or user_email or f"User #{act.user_id}",
            "action": act.action,
            "details": act.details,
            "file_id": act.file_id,
            "folder_id": act.folder_id,
            "created_at": act.created_at.isoformat() if act.created_at else None,
        }
        for act, user_name, user_email in records
    ]


# ==============================================================================
# Stars API
# ==============================================================================
@app.get("/api/stars")
def list_stars(user_id: int = 1, db: Session = Depends(get_db)):
    stars = db.query(Star).filter(Star.user_id == user_id).all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "file_id": s.file_id,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in stars
    ]

