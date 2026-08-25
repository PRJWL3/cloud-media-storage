from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = FastAPIFile(...), db: Session = Depends(get_db)):
    pass
