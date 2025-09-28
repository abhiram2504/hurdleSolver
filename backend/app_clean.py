"""
Clean HurdleReader Backend - Database-driven PDF Processing
"""
import os
import json
import hashlib
import re
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import PyPDF2
import textstat

from models import Base, Doc, Chunk, Task, Progress, Attempt
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

def categorize_topic(text):
    """Categorize the topic of the text using keyword analysis"""
    text_lower = text.lower()
    
    # Define topic categories with keywords
    topic_categories = {
        'technology': ['algorithm', 'computer', 'software', 'digital', 'data', 'system', 'network', 'programming', 'artificial', 'intelligence', 'machine', 'learning'],
        'science': ['research', 'study', 'analysis', 'experiment', 'scientific', 'theory', 'hypothesis', 'method', 'process', 'discovery'],
        'business': ['market', 'company', 'business', 'economic', 'financial', 'profit', 'strategy', 'management', 'customer', 'product'],
        'education': ['learning', 'student', 'education', 'teaching', 'academic', 'knowledge', 'skill', 'training', 'course', 'study'],
        'health': ['health', 'medical', 'patient', 'treatment', 'disease', 'medicine', 'therapy', 'clinical', 'diagnosis', 'healthcare'],
        'social': ['social', 'community', 'society', 'cultural', 'people', 'human', 'relationship', 'interaction', 'communication'],
        'environment': ['environment', 'climate', 'nature', 'ecological', 'green', 'sustainability', 'conservation', 'pollution', 'energy'],
        'general': []  # fallback category
    }
    
    # Count keyword matches for each category
    category_scores = {}
    for category, keywords in topic_categories.items():
        if category == 'general':
            continue
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            category_scores[category] = score
    
    # Return the category with the highest score, or 'general' if no matches
    if category_scores:
        return max(category_scores, key=category_scores.get)
    return 'general'

def analyze_user_performance(user_id, doc_id, db_session):
    """Analyze user performance by topic categories"""
    # Get all attempts for this user and document
    attempts = db_session.query(Attempt, Task, Chunk).join(Task, Attempt.task_id == Task.id).join(Chunk, Task.chunk_id == Chunk.id).filter(Task.doc_id == doc_id, Attempt.user_id == user_id).all()
    
    if not attempts:
        return {"message": "No attempts found"}
    
    # Categorize performance by topic
    topic_performance = {}
    
    for attempt, task, chunk in attempts:
        topic = categorize_topic(chunk.text)
        
        if topic not in topic_performance:
            topic_performance[topic] = {
                'correct': 0,
                'total': 0,
                'avg_time': 0,
                'total_time': 0
            }
        
        topic_performance[topic]['total'] += 1
        topic_performance[topic]['total_time'] += attempt.time_ms
        
        if attempt.correct:
            topic_performance[topic]['correct'] += 1
    
    # Calculate averages and identify strengths/weaknesses
    for topic, stats in topic_performance.items():
        stats['accuracy'] = (stats['correct'] / stats['total']) * 100 if stats['total'] > 0 else 0
        stats['avg_time'] = stats['total_time'] / stats['total'] if stats['total'] > 0 else 0
    
    # Find best and worst topics
    if topic_performance:
        best_topic = max(topic_performance.keys(), key=lambda t: topic_performance[t]['accuracy'])
        worst_topic = min(topic_performance.keys(), key=lambda t: topic_performance[t]['accuracy'])
        
        return {
            'topic_performance': topic_performance,
            'best_topic': best_topic,
            'worst_topic': worst_topic,
            'total_attempts': len(attempts)
        }
    
    return {"message": "No performance data available"}

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

def generate_fallback_answer(query, document_text):
    """Generate a simple answer when LLM is not available"""
    query_lower = query.lower()
    doc_lower = document_text.lower()
    
    # Simple keyword search
    sentences = document_text.split('.')
    relevant_sentences = []
    
    for sentence in sentences:
        if any(word in sentence.lower() for word in query_lower.split() if len(word) > 2):
            relevant_sentences.append(sentence.strip())
    
    if relevant_sentences:
        # Return first few relevant sentences
        answer = '. '.join(relevant_sentences[:2])
        if len(answer) > 200:
            answer = answer[:200] + "..."
        return jsonify({"answer": answer})
    else:
        return jsonify({"answer": "I couldn't find specific information about your query in the document. Try rephrasing your question or using different keywords."})

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
        # Configure upload folder
    app.config['UPLOAD_FOLDER'] = 'uploads'
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
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
            
            # No boss battles - removed feature
            
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
                'is_boss': False,  # No boss battles
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
            time_taken = data.get('time_ms', 0)  # Time in milliseconds
            
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
                # Record skip attempt
                attempt = Attempt(
                    task_id=task.id,
                    user_id=1,
                    answer_json={'skipped': True},
                    correct=False,
                    time_ms=time_taken
                )
                db.add(attempt)
                
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
            
            # Record attempt in database
            attempt = Attempt(
                task_id=task.id,
                user_id=1,
                answer_json={'selected_option': selected_option, 'user_answer': user_answer},
                correct=is_correct,
                time_ms=time_taken
            )
            db.add(attempt)
            
            # Calculate points
            points = int(score * 0.1)  # 10 points for perfect score
            
            # Update progress
            progress.cleared += 1
            if is_correct:
                progress.xp += points
                progress.streak += 1
            else:
                progress.streak = 0
            
            db.commit()
            
            # Get performance analysis
            performance_analysis = analyze_user_performance(1, pdf_id, db)
            
            return jsonify({
                'correct': is_correct,
                'score': score,
                'xp': progress.xp,
                'streak': progress.streak,
                'current': progress.cleared,
                'explanation': explanation,
                'time_taken': time_taken,
                'performance_analysis': performance_analysis
            })
            
        finally:
            db.close()
    
    @app.route("/api/performance/<int:pdf_id>", methods=["GET"])
    def get_performance_analysis(pdf_id):
        db = SessionLocal()
        try:
            analysis = analyze_user_performance(1, pdf_id, db)
            return jsonify(analysis)
        finally:
            db.close()
    
    @app.route('/api/download/<int:pdf_id>')
    def download_pdf(pdf_id):
        """Download the original PDF file"""
        db = SessionLocal()
        try:
            doc = db.query(Doc).filter(Doc.id == pdf_id).first()
            if not doc:
                return jsonify({"error": "Document not found"}), 404
            
            # Check if file exists
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], doc.storage_path)
            if not os.path.exists(file_path):
                return jsonify({"error": "File not found on server"}), 404
            
            # Extract filename from storage path for download
            filename = os.path.basename(doc.storage_path)
            return send_file(file_path, as_attachment=True, download_name=filename)
        except Exception as e:
            print(f"Error downloading PDF: {e}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()

    @app.route('/api/query/<int:pdf_id>', methods=['POST'])
    def query_document(pdf_id):
        """Query the document with LLM assistance"""
        db = SessionLocal()
        try:
            data = request.get_json()
            query = data.get('query', '').strip()
            
            if not query:
                return jsonify({"error": "Query is required"}), 400
            
            # Get document
            doc = db.query(Doc).filter(Doc.id == pdf_id).first()
            if not doc:
                return jsonify({"error": "Document not found"}), 404
            
            # Get document text from chunks
            chunks = db.query(Chunk).filter(Chunk.doc_id == pdf_id).all()
            document_text = "\n\n".join([chunk.text for chunk in chunks])
            
            # Generate answer using LLM
            client = get_openai_client()
            if client:
                try:
                    prompt = f"""
                    Based on the following document, answer the user's question concisely and accurately.
                    
                    Document content:
                    {document_text[:4000]}
                    
                    User question: {query}
                    
                    Instructions:
                    - Provide a short, direct answer (2-3 sentences maximum)
                    - Only use information from the document
                    - If the answer isn't in the document, say "This information is not available in the document"
                    - Be specific and cite relevant details when possible
                    """
                    
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.3,
                        max_tokens=150
                    )
                    
                    answer = response.choices[0].message.content.strip()
                    return jsonify({"answer": answer})
                    
                except Exception as e:
                    print(f"Error with OpenAI: {e}")
                    # Fallback to simple text search
                    return generate_fallback_answer(query, document_text)
            else:
                # Fallback when OpenAI is not available
                return generate_fallback_answer(query, document_text)
                
        except Exception as e:
            print(f"Error querying document: {e}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5002)  # Use port 5002 to avoid conflicts
