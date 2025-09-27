# db.py
import os
from flask import current_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

def get_db_uri():
    # sqlite file in instance/ folder
    os.makedirs("instance", exist_ok=True)
    return "sqlite:///instance/gamify.db"

engine = create_engine(get_db_uri(), echo=False, future=True)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False))
