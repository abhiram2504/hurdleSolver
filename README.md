# HurdleReader

A gamified web app that turns any PDF into a hurdle race: users clear small reading chunks with micro-tasks (cloze, highlight, 2-choice check), face a boss battle every 5 hurdles, earn XP/coins, and track streaks.

## Tech Stack
- **Frontend:** React (TypeScript), Tailwind CSS
- **Backend:** Flask (Python)
- **PDF Processing:** PyPDF2 (Python)
- **Database:** SQLite (via SQLAlchemy)

## Getting Started

### Backend (Flask)
```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors pypdf2 sqlalchemy flask-login
python app.py
```

### Frontend (React + Vite + Tailwind)
```sh
cd frontend
npm install
# If Tailwind config fails, try: npx tailwindcss init -p
npm run dev
```

## Features (MVP)
- PDF upload & chunking
- Micro-tasks per chunk (cloze, highlight, 2-choice)
- Boss battle every 5 hurdles
- XP/coins, streaks, dashboard

---

**Note:** If you encounter issues with Tailwind CSS config, try running `npx tailwindcss init -p` manually in the frontend directory.
