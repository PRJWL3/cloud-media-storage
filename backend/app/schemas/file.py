from pydantic import BaseModel
from typing import Optional

class FileBase(BaseModel):
    name: str
    folder_id: Optional[int] = None

class FileCreate(FileBase):
    path: str
    size: int
    mime_type: str
    owner_id: int

class FileResponse(FileBase):
    id: int
    path: str
    size: int
    mime_type: str
    owner_id: int

    class Config:
        from_attributes = True
