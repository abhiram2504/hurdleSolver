# models.py
from datetime import datetime
from sqlalchemy import String, Integer, Text, JSON, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from typing import Optional

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "app_user"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    handle: Mapped[str] = mapped_column(String(64), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="learner")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Doc(Base):
    __tablename__ = "doc"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("app_user.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(32))  # pdf|url|...
    storage_path: Mapped[str] = mapped_column(String(1024))
    meta_json: Mapped[dict] = mapped_column(JSON, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="doc", cascade="all, delete-orphan")

class Chunk(Base):
    __tablename__ = "chunk"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doc_id: Mapped[int] = mapped_column(ForeignKey("doc.id"))
    idx: Mapped[int] = mapped_column(Integer)
    section: Mapped[Optional[str]] = mapped_column(String(255), default=None)
    text: Mapped[str] = mapped_column(Text)
    span_json: Mapped[dict] = mapped_column(JSON, default={})  # page ranges/bboxes
    features_json: Mapped[dict] = mapped_column(JSON, default={})
    difficulty: Mapped[str] = mapped_column(String(1), default="M")  # E/M/H
    hash: Mapped[str] = mapped_column(String(64))
    doc: Mapped[Doc] = relationship(back_populates="chunks")
    tasks: Mapped[list["Task"]] = relationship(back_populates="chunk", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "task"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doc_id: Mapped[int] = mapped_column(ForeignKey("doc.id"))
    chunk_id: Mapped[int] = mapped_column(ForeignKey("chunk.id"))
    type: Mapped[str] = mapped_column(String(16))  # cloze|check2|summary
    payload_json: Mapped[dict] = mapped_column(JSON)
    difficulty: Mapped[str] = mapped_column(String(1), default="M")
    source: Mapped[str] = mapped_column(String(16), default="auto")
    chunk: Mapped[Chunk] = relationship(back_populates="tasks")

class Attempt(Base):
    __tablename__ = "attempt"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id"))
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("app_user.id"), nullable=True)
    answer_json: Mapped[dict] = mapped_column(JSON, default={})
    correct: Mapped[bool] = mapped_column(Boolean, default=False)
    time_ms: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Progress(Base):
    __tablename__ = "progress"
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), primary_key=True)
    doc_id: Mapped[int] = mapped_column(ForeignKey("doc.id"), primary_key=True)
    cleared: Mapped[int] = mapped_column(Integer, default=0)
    hearts: Mapped[int] = mapped_column(Integer, default=5)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    combo: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
