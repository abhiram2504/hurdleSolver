"""
Clean HurdleReader Backend - Database-driven PDF Processing
"""
import os
import json
import hashlib
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import PyPDF2
import textstat

from models import Base, Doc, Chunk, Task, Progress
from db import engine, SessionLocal
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("OpenAI not available - using fallback questions")

# Load environment variables
load_dotenv()

def get_openai_client():
    """Initialize and return OpenAI client if API key is available"""
    if not OPENAI_AVAILABLE:
        return None
    
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            return OpenAI(api_key=api_key)
        except Exception as e:
            print(f"Error initializing OpenAI client: {e}")
    return None

def extract_pdf_text(file_path):
    """Extract text from PDF using PyPDF2"""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    return text.strip()

def calculate_chunks_count(text_length):
    """Calculate number of chunks based on text length"""
    # Base: 1 chunk per 500 words, minimum 3, maximum 15
    words_count = len(text_length.split())
    chunks = max(3, min(15, words_count // 500))
    return chunks

def create_chunks(text, num_chunks):
    """Split text into chunks of roughly equal size"""
    words = text.split()
    chunk_size = len(words) // num_chunks
    
    chunks = []
    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = start_idx + chunk_size if i < num_chunks - 1 else len(words)
        chunk_text = " ".join(words[start_idx:end_idx])
        
        # Create hash for chunk
        chunk_hash = hashlib.md5(chunk_text.encode()).hexdigest()
        
        chunks.append({
            'idx': i,
            'text': chunk_text,
            'hash': chunk_hash,
            'difficulty': 'M'  # Medium difficulty by default
        })
    
    return chunks

def extract_important_concepts(text):
    """Extract important and niche concepts from text"""
    # Find technical terms, proper nouns, and important concepts
    sentences = re.split(r'[.!?]+', text)
    concepts = []
    
    # Look for technical terms (capitalized words, terms with specific patterns)
    technical_patterns = [
        r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # Two-word proper nouns
        r'\b[a-z]+ing\b',  # -ing terms (learning, processing, etc.)
        r'\b[a-z]+tion\b', # -tion terms (recognition, classification, etc.)
        r'\b[a-z]+ment\b', # -ment terms (development, improvement, etc.)
        r'\b[a-z]+ness\b', # -ness terms (effectiveness, etc.)
    ]
    
    for pattern in technical_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        concepts.extend(matches)
    
    # Find key terms that appear multiple times
    words = text.lower().split()
    word_freq = {}
    for word in words:
        if len(word) > 4 and word.isalpha():
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get most frequent important words
    frequent_terms = [word for word, freq in word_freq.items() if freq > 1 and len(word) > 6]
    concepts.extend(frequent_terms[:3])
    
    return list(set(concepts))[:5]  # Return top 5 unique concepts

def generate_question(chunk_text, question_type="choice"):
    """Generate a multiple choice question focusing on important and niche topics"""
    client = get_openai_client()
    
    # Extract important concepts first
    important_concepts = extract_important_concepts(chunk_text)
    
    prompt = f"""
    Create a challenging multiple choice question about NICHE and IMPORTANT topics from this text. 
    Focus on specific details, technical concepts, and key information that tests deep understanding.
    
    Text: {chunk_text}
    
    Important concepts to focus on: {', '.join(important_concepts) if important_concepts else 'key technical details'}
    
    Requirements:
    - Question must be ONE line only (max 15 words)
    - Focus on NICHE, SPECIFIC, and IMPORTANT details (not general topics)
    - Must have exactly 4 options (A, B, C, D)
    - All options should be plausible and realistic (not obviously wrong)
    - Options should be similar in length and complexity
    - One correct answer based on specific information in the text
    - Make incorrect options believable but subtly wrong
    - Include explanation of why the correct answer is right
    
    Return JSON: {{"type": "choice", "question": "specific niche question about important detail?", "options": ["Realistic Option A", "Realistic Option B", "Realistic Option C", "Realistic Option D"], "correct": 0, "explanation": "detailed explanation why this specific answer is correct"}}
    """
    
    try:
        if client:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            result = json.loads(response.choices[0].message.content)
            return result
    except Exception as e:
        print(f"Error generating question with OpenAI: {e}")
    
    # Enhanced fallback question generation focusing on important concepts
    concepts = extract_important_concepts(chunk_text)
    
    if concepts and len(concepts) >= 2:
        main_concept = concepts[0]
        alt_concept = concepts[1]
        # Create more specific questions about the concept
        question = f"What is the primary characteristic of {main_concept.lower()}?"
        options = [
            f"It enables specific functionality",
            f"It provides {alt_concept.lower()} capabilities", 
            f"It replaces traditional methods",
            f"It simplifies complex processes"
        ]
        explanation = f"The text specifically describes how {main_concept} functions as a key component."
    elif concepts:
        main_concept = concepts[0]
        question = f"How does {main_concept.lower()} function in this context?"
        options = [
            "It processes information systematically",
            "It stores data temporarily",
            "It validates input parameters",
            "It generates random outputs"
        ]
        explanation = f"The text explains the specific function of {main_concept} in detail."
    else:
        # Find specific details in the text
        sentences = re.split(r'[.!?]+', chunk_text)
        if sentences and len(sentences) > 1:
            # Create question about relationship between concepts
            question = "What relationship is described in the text?"
            options = [
                "A hierarchical dependency structure",
                "A parallel processing system",
                "An independent component model",
                "A reverse feedback mechanism"
            ]
            explanation = "The text describes specific relationships between the mentioned concepts."
        else:
            question = "What methodology is primarily discussed?"
            options = [
                "A systematic approach to problem-solving",
                "A random trial-and-error method", 
                "A theoretical framework only",
                "A simplified overview technique"
            ]
            explanation = "The text focuses on a specific systematic methodology."
    
    return {
        "type": "choice",
        "question": question,
        "options": options,
        "correct": 0,
        "explanation": explanation
    }

def validate_answer_with_openai(user_answer_idx, correct_idx, question, options, chunk_text):
    """Use OpenAI to validate answer and provide detailed explanation"""
    client = get_openai_client()
    
    user_option = options[user_answer_idx] if 0 <= user_answer_idx < len(options) else "Invalid"
    correct_option = options[correct_idx] if 0 <= correct_idx < len(options) else "Unknown"
    
    prompt = f"""
    A student answered a multiple choice question. Provide feedback and explanation.
    
    Text: {chunk_text}
    Question: {question}
    Options: {', '.join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)])}
    Correct Answer: {chr(65+correct_idx)}. {correct_option}
    Student Answer: {chr(65+user_answer_idx)}. {user_option}
    
    Provide a brief explanation (1-2 sentences) of why the correct answer is right.
    
    Return JSON: {{"explanation": "brief explanation of why the correct answer is right"}}
    """
    
    try:
        if client:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            result = json.loads(response.choices[0].message.content)
            return result.get("explanation", f"The correct answer is {correct_option}.")
    except Exception as e:
        print(f"Error getting explanation from OpenAI: {e}")
    
    # Fallback explanation
    return f"The correct answer is {correct_option}."

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    @app.route("/health")
    def health():
        return {"ok": True}
    
    @app.route("/api/upload", methods=["POST"])
    def upload_pdf():
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        try:
            # Save file temporarily
            upload_dir = os.getenv('UPLOAD_DIR', './uploads')
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, file.filename)
            file.save(file_path)
            
            # Extract text from PDF
            pdf_text = extract_pdf_text(file_path)
            
            # Calculate number of chunks based on file size
            num_chunks = calculate_chunks_count(pdf_text)
            
            # Create chunks
            chunks_data = create_chunks(pdf_text, num_chunks)
            
            # Save to database
            db = SessionLocal()
            try:
                # Create document record
                doc = Doc(
                    title=file.filename,
                    source_type='pdf',
                    storage_path=file_path,
                    meta_json={'original_filename': file.filename, 'text_length': len(pdf_text)}
                )
                db.add(doc)
                db.flush()  # Get the doc.id
                
                # Create chunks and questions (only multiple choice)
                for chunk_data in chunks_data:
                    # Create chunk
                    chunk = Chunk(
                        doc_id=doc.id,
                        idx=chunk_data['idx'],
                        text=chunk_data['text'],
                        hash=chunk_data['hash'],
                        difficulty=chunk_data['difficulty']
                    )
                    db.add(chunk)
                    db.flush()  # Get the chunk.id
                    
                    # Generate multiple choice question for this chunk
                    question_data = generate_question(chunk_data['text'], 'choice')
                    
                    # Create task
                    task = Task(
                        doc_id=doc.id,
                        chunk_id=chunk.id,
                        type=question_data['type'],
                        payload_json=question_data,
                        difficulty='M'
                    )
                    db.add(task)
                
                # Create initial progress record
                progress = Progress(
                    user_id=1,  # Default user for now
                    doc_id=doc.id,
                    cleared=0,
                    xp=0,
                    streak=0
                )
                db.add(progress)
                
                db.commit()
                
                return jsonify({
                    'pdf_id': doc.id,
                    'num_chunks': num_chunks,
                    'title': f"Learning: {file.filename}"
                })
                
            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()
                # Clean up temporary file
                if os.path.exists(file_path):
                    os.remove(file_path)
                    
        except Exception as e:
            return jsonify({'error': f'Failed to process PDF: {str(e)}'}), 500
    
    @app.route("/api/hurdle/<int:pdf_id>", methods=["GET"])
    def get_hurdle(pdf_id):
        db = SessionLocal()
        try:
            # Get progress
            progress = db.query(Progress).filter_by(doc_id=pdf_id, user_id=1).first()
            if not progress:
                return jsonify({'error': 'Document not found'}), 404
            
            # Get current chunk and task
            chunks = db.query(Chunk).filter_by(doc_id=pdf_id).order_by(Chunk.idx).all()
            
            if progress.cleared >= len(chunks):
                return jsonify({'done': True})
            
            current_chunk = chunks[progress.cleared]
            task = db.query(Task).filter_by(chunk_id=current_chunk.id).first()
            
            if not task:
                return jsonify({'error': 'No task found for this chunk'}), 404
            
            # Check if it's a boss battle (every 5th hurdle)
            is_boss = (progress.cleared + 1) % 5 == 0
            
            # Get document for preview
            doc = db.query(Doc).filter_by(id=pdf_id).first()
            full_text = ""
            if doc:
                # Get all chunks in order to reconstruct full text
                all_chunks = db.query(Chunk).filter_by(doc_id=pdf_id).order_by(Chunk.idx).all()
                full_text = "\n\n".join([chunk.text for chunk in all_chunks])
            
            return jsonify({
                'chunk': current_chunk.text,
                'task': task.payload_json,
                'task_type': task.type,
                'is_boss': is_boss,
                'idx': progress.cleared,
                'difficulty': current_chunk.difficulty,
                'document_text': full_text,
                'document_title': doc.title if doc else "Document"
            })
            
        finally:
            db.close()
    
    @app.route("/api/hurdle/<int:pdf_id>", methods=["POST"])
    def submit_answer(pdf_id):
        db = SessionLocal()
        try:
            data = request.json or {}
            user_answer = data.get('answer', '')
            is_skip = data.get('skip', False)
            
            # Get progress and current task
            progress = db.query(Progress).filter_by(doc_id=pdf_id, user_id=1).first()
            if not progress:
                return jsonify({'error': 'Document not found'}), 404
            
            chunks = db.query(Chunk).filter_by(doc_id=pdf_id).order_by(Chunk.idx).all()
            if progress.cleared >= len(chunks):
                return jsonify({'error': 'All chunks completed'}), 400
            
            current_chunk = chunks[progress.cleared]
            task = db.query(Task).filter_by(chunk_id=current_chunk.id).first()
            
            # Handle skip
            if is_skip:
                progress.cleared += 1
                progress.streak = 0  # Reset streak for skipping
                db.commit()
                
                return jsonify({
                    'correct': False,
                    'score': 0,
                    'xp': progress.xp,
                    'streak': progress.streak,
                    'current': progress.cleared,
                    'explanation': 'Question skipped. Try to answer the next one!',
                    'skipped': True
                })
            
            # Validate answer (only multiple choice now)
            task_data = task.payload_json
            is_correct = False
            score = 0
            explanation = ""
            
            try:
                selected_option = int(user_answer)
                correct_option = task_data.get('correct', 0)
                is_correct = selected_option == correct_option
                score = 100 if is_correct else 0
                
                # Get detailed explanation from OpenAI
                explanation = validate_answer_with_openai(
                    selected_option, 
                    correct_option, 
                    task_data.get('question', ''),
                    task_data.get('options', []),
                    current_chunk.text
                )
                
            except (ValueError, TypeError):
                is_correct = False
                score = 0
                explanation = "Please select a valid option."
            
            # Calculate points
            points = int(score * 0.1)  # 10 points for perfect score
            
            # Update progress
            if is_correct:
                progress.cleared += 1
                progress.xp += points
                progress.streak += 1
            else:
                progress.streak = 0
            
            db.commit()
            
            return jsonify({
                'correct': is_correct,
                'score': score,
                'xp': progress.xp,
                'streak': progress.streak,
                'current': progress.cleared,
                'explanation': explanation
            })
            
        finally:
            db.close()
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5002)  # Use port 5002 to avoid conflicts
