from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()

@router.post("/")
def create_folder(db: Session = Depends(get_db)):
    pass
