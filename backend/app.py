from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import PyPDF2

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# In-memory storage for MVP (replace with DB for production)
user_progress = {}
pdf_chunks = {}

# --- PDF Upload Endpoint ---
@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    # Parse and chunk PDF
    chunks = chunk_pdf(filepath)
    pdf_id = filename  # For MVP, use filename as ID
    pdf_chunks[pdf_id] = chunks
    user_progress[pdf_id] = {'current': 0, 'xp': 0, 'streak': 0}
    return jsonify({'pdf_id': pdf_id, 'num_chunks': len(chunks)})

# --- Get Next Hurdle (Chunk) ---
@app.route('/api/hurdle/<pdf_id>', methods=['GET'])
def get_hurdle(pdf_id):
    progress = user_progress.get(pdf_id, {'current': 0})
    idx = progress['current']
    chunks = pdf_chunks.get(pdf_id, [])
    if idx >= len(chunks):
        return jsonify({'done': True})
    chunk = chunks[idx]
    # For MVP, alternate micro-task types
    task_type = ['cloze', 'highlight', 'choice', 'cloze', 'highlight'][idx % 5]
    is_boss = (idx > 0 and idx % 5 == 0)
    return jsonify({'chunk': chunk, 'task_type': task_type, 'is_boss': is_boss, 'idx': idx})

# --- Submit Answer and Progress ---
@app.route('/api/hurdle/<pdf_id>', methods=['POST'])
def submit_hurdle(pdf_id):
    data = request.json
    correct = data.get('correct', True)  # For MVP, always true
    progress = user_progress.get(pdf_id)
    if not progress:
        return jsonify({'error': 'PDF not found'}), 404
    if correct:
        progress['current'] += 1
        progress['xp'] += 10
        progress['streak'] += 1
    else:
        progress['streak'] = 0
    return jsonify({'xp': progress['xp'], 'streak': progress['streak'], 'current': progress['current']})

# --- Get Progress ---
@app.route('/api/progress/<pdf_id>', methods=['GET'])
def get_progress(pdf_id):
    progress = user_progress.get(pdf_id, {'current': 0, 'xp': 0, 'streak': 0})
    return jsonify(progress)

# --- PDF Chunking Utility ---
def chunk_pdf(filepath, chunk_size=100):
    # Simple text chunking: every N words
    reader = PyPDF2.PdfReader(filepath)
    text = " ".join(page.extract_text() or '' for page in reader.pages)
    words = text.split()
    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
    return chunks

if __name__ == '__main__':
    app.run(debug=True)
