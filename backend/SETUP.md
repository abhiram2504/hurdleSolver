# HurdleSolver Backend Setup

## Prerequisites

1. Python 3.13 or higher
2. Virtual environment (recommended)

## Installation

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

1. Create a `.env` file in the backend directory:
   ```bash
   touch .env
   ```

2. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   Get your API key from: https://platform.openai.com/api-keys

3. Optional: Set upload directory:
   ```
   UPLOAD_DIR=./uploads
   ```

## Running the Application

1. Make sure the virtual environment is activated:
   ```bash
   source venv/bin/activate
   ```

2. Start the Flask server:
   ```bash
   python app.py
   ```

3. The server will start on http://localhost:5000

## API Endpoints

- `GET /health` - Health check
- `POST /api/upload` - Upload PDF file
- `GET /api/hurdle/<pdf_id>` - Get next hurdle/chunk
- `POST /api/hurdle/<pdf_id>` - Submit answer for current hurdle

## Features

- PDF text extraction using PyPDF2
- AI-powered educational content chunking
- Interactive game generation (matching, multiple choice)
- Boss battle challenges every 5 hurdles
- XP and streak tracking
- Fallback functionality when OpenAI API key is not configured

## Troubleshooting

### ModuleNotFoundError: No module named 'fitz'
- This was fixed by replacing PyMuPDF with PyPDF2
- If you encounter similar issues, ensure all dependencies are installed in the virtual environment

### OpenAI API Key Not Configured
- The app will run without an API key but will use fallback functionality
- Add your OpenAI API key to the `.env` file for full AI features

### Port Already in Use
- If port 5000 is in use, modify the `app.run()` call in `app.py` to use a different port
