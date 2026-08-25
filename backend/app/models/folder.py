from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="folders")
    parent = relationship("Folder", remote_side=[id], back_populates="subfolders")
    subfolders = relationship("Folder", back_populates="parent", cascade="all, delete-orphan")
    files = relationship("File", back_populates="folder")
