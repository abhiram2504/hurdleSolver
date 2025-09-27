# app.py
import os, json, math
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

from db import engine, SessionLocal
from models import Base, User, Doc, Chunk, Task, Attempt, Progress
from services.ingest import extract_blocks, greedy_chunk
from services.labeling import difficulty_heuristic
from services.tasks import generate_tasks_for_chunk
from services.roadmap import build_linear_roadmap
from services.scoring import score_attempt

# Optional LLM
USE_LLM = False
try:
    from llm.chains import refine_segments, make_boss_questions
except Exception:
    pass

def create_app():
    load_dotenv()
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
    app.config["UPLOAD_DIR"] = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)

    global USE_LLM
    USE_LLM = os.getenv("USE_LLM", "false").lower() == "true"

    JWTManager(app)

    # DB init
    Base.metadata.create_all(bind=engine)

    # --------- Auth (super minimal) ----------
    @app.post("/api/auth/register")
    def register():
        data = request.json or {}
        handle, email, password = data.get("handle"), data.get("email"), data.get("password")
        if not all([handle, email, password]):
            return jsonify({"error": "missing fields"}), 400
        db = SessionLocal()
        try:
            if db.query(User).filter(User.email==email).first():
                return jsonify({"error": "email exists"}), 409
            u = User(handle=handle, email=email, password_hash=password)  # hash in real app
            db.add(u); db.commit()
            token = create_access_token(identity=str(u.id))
            return jsonify({"token": token, "user": {"id": u.id, "handle": u.handle}})
        finally:
            db.close()

    @app.post("/api/auth/login")
    def login():
        data = request.json or {}
        email, password = data.get("email"), data.get("password")
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.email==email).first()
            if not u or u.password_hash != password:
                return jsonify({"error": "invalid credentials"}), 401
            token = create_access_token(identity=str(u.id))
            return jsonify({"token": token, "user": {"id": u.id, "handle": u.handle}})
        finally:
            db.close()

    # --------- Upload & Ingest ----------
    @app.post("/api/docs")
    @jwt_required(optional=True)
    def upload_doc():
        if "file" not in request.files:
            return jsonify({"error":"no file"}), 400
        f = request.files["file"]
        title = request.form.get("title") or f.filename
        path = os.path.join(app.config["UPLOAD_DIR"], f.filename)
        f.save(path)

        db = SessionLocal()
        try:
            doc = Doc(title=title, source_type="pdf", storage_path=path, meta_json={})
            db.add(doc); db.commit()

            # Extract → Chunk
            blocks = extract_blocks(path)
            raw_chunks = greedy_chunk(blocks)

            # Optional LLM refine PER CHUNK (budget-friendly: only if len>1200 chars)
            chunks_out = []
            for rc in raw_chunks:
                text = rc["text"]
                pieces = [{"text": text, "cognitive_load": 3, "rationale": "heuristic-only"}]
                if USE_LLM and len(text) > 1200:
                    try:
                        pieces = refine_segments(text)
                    except Exception:
                        pass
                for piece in pieces:
                    feat = difficulty_heuristic(piece["text"])
                    chunks_out.append({
                        "text": piece["text"],
                        "pages": rc["pages"],
                        "hash": rc["hash"],
                        "features": feat,
                        "difficulty": feat["difficulty"]
                    })

            # Persist chunks + tasks
            for i, ch in enumerate(chunks_out, start=1):
                c = Chunk(
                    doc_id=doc.id, idx=i, section=None, text=ch["text"],
                    span_json={"pages": ch["pages"]}, features_json=ch["features"],
                    difficulty=ch["difficulty"], hash=ch["hash"]
                )
                db.add(c); db.flush()
                for t in generate_tasks_for_chunk(ch["text"], ch["difficulty"]):
                    db.add(Task(doc_id=doc.id, chunk_id=c.id, type=t["type"], payload_json=t, difficulty=ch["difficulty"]))
            db.commit()

            return jsonify({"docId": doc.id, "title": doc.title})
        finally:
            db.close()

    @app.get("/api/docs/<int:doc_id>")
    @jwt_required(optional=True)
    def get_doc(doc_id: int):
        db = SessionLocal()
        try:
            d = db.get(Doc, doc_id)
            if not d: return jsonify({"error":"not found"}), 404
            chs = db.query(Chunk).filter(Chunk.doc_id==doc_id).order_by(Chunk.idx).all()
            chunks_json = [{"id": c.id, "idx": c.idx, "difficulty": c.difficulty,
                            "features": c.features_json, "section": c.section} for c in chs]
            return jsonify({"docId": d.id, "title": d.title, "chunks": chunks_json})
        finally:
            db.close()

    @app.get("/api/docs/<int:doc_id>/roadmap")
    def roadmap(doc_id: int):
        db = SessionLocal()
        try:
            chs = db.query(Chunk).filter(Chunk.doc_id==doc_id).order_by(Chunk.idx).all()
            model = [{"idx": c.idx, "difficulty": c.difficulty} for c in chs]
            rm = build_linear_roadmap(model, boss_every=5)
            return jsonify(rm)
        finally:
            db.close()

    @app.get("/api/chunks/<int:chunk_id>/tasks")
    def chunk_tasks(chunk_id: int):
        db = SessionLocal()
        try:
            ts = db.query(Task).filter(Task.chunk_id==chunk_id).all()
            return jsonify([{"id": t.id, "type": t.type, "payload": t.payload_json, "difficulty": t.difficulty} for t in ts])
        finally:
            db.close()

    @app.post("/api/tasks/<int:task_id>/attempt")
    @jwt_required(optional=True)
    def attempt(task_id: int):
        data = request.json or {}
        answer = data.get("answer", {})
        time_ms = int(data.get("timeMs", 0))
        user_id = get_jwt_identity()
        db = SessionLocal()
        try:
            t = db.get(Task, task_id)
            if not t: return jsonify({"error":"task not found"}), 404
            payload = t.payload_json
            correct = False
            if t.type == "cloze":
                correct = (str(answer).strip().lower() == str(payload.get("answer","")).strip().lower())
            elif t.type == "check2":
                correct = (int(answer) == payload.get("answer_idx", -1))
            elif t.type == "summary1":
                # super simple threshold: overlap of unique words ≥ 0.5 (hackathon-safe).
                ref = payload.get("reference","")
                a = set(str(answer).lower().split())
                r = set(ref.lower().split())
                jacc = len(a & r)/max(1,len(a | r))
                correct = jacc >= 0.5

            # fetch or init progress (anonymous users supported)
            doc_id = t.doc_id
            prog = None
            if user_id:
                prog = db.query(Progress).filter(Progress.user_id==int(user_id), Progress.doc_id==doc_id).first()
                if not prog:
                    prog = Progress(user_id=int(user_id), doc_id=doc_id)
                    db.add(prog); db.flush()

            combo = prog.combo if prog else 0
            xp = score_attempt(correct, time_ms, combo)
            if prog:
                if correct:
                    prog.combo += 1
                    prog.streak += 1
                    prog.xp += xp
                else:
                    prog.combo = 0
                    prog.hearts = max(0, prog.hearts - 1)
                    prog.streak = 0

            att = Attempt(task_id=t.id, user_id=int(user_id) if user_id else None,
                          answer_json=answer, correct=correct, time_ms=time_ms)
            db.add(att)
            db.commit()
            return jsonify({
                "correct": correct,
                "xp": xp,
                "hearts": prog.hearts if prog else None,
                "combo": prog.combo if prog else (1 if correct else 0)
            })
        finally:
            db.close()

    # (Optional) Boss generation endpoint using LLM
    @app.get("/api/docs/<int:doc_id>/boss/<int:boss_idx>")
    def boss(doc_id: int, boss_idx: int):
        db = SessionLocal()
        try:
            chs = db.query(Chunk).filter(Chunk.doc_id==doc_id).order_by(Chunk.idx).all()
            start = (boss_idx-1)*5 + 1
            end = boss_idx*5
            subset = [c.text for c in chs if start <= c.idx <= end]
            if USE_LLM and subset:
                qs = make_boss_questions(subset)
            else:
                qs = []
            return jsonify({"bossId": boss_idx, "questions": qs, "covers": [start, end]})
        finally:
            db.close()

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
