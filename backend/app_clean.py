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

from openai import OpenAI
# Load environment variables

OPENAI_AVAILABLE=True

load_dotenv()

def get_openai_client():
    """Initialize and return OpenAI client if API key is available"""
    if not OPENAI_AVAILABLE:
        print("OpenAI library not available")
        return None
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not found in environment variables")
        print("Please set your OpenAI API key:")
        print("1. Create a .env file in the backend directory")
        print("2. Add: OPENAI_API_KEY=your-actual-api-key-here")
        print("3. Get your API key from: https://platform.openai.com/api-keys")
        return None
    
    if api_key == "your-openai-api-key-here" or api_key == "your-actual-api-key-here":
        print("Please replace the placeholder API key with your actual OpenAI API key")
        return None
    
    try:
        # Initialize OpenAI client with just the API key
        client = OpenAI(api_key=api_key)
        print("OpenAI client initialized successfully")
        return client
    except Exception as e:
        print(f"Error initializing OpenAI client: {e}")
        print("Please check your API key is valid")
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
    """Analyze user performance by topic categories based on progress"""
    # Get progress and chunks since we no longer store attempts
    progress = db_session.query(Progress).filter_by(doc_id=doc_id, user_id=user_id).first()
    chunks = db_session.query(Chunk).filter_by(doc_id=doc_id).order_by(Chunk.idx).all()
    
    if not progress or not chunks:
        return {"message": "No progress data found"}
    
    # Categorize performance by topic based on completed chunks
    topic_performance = {}
    total_chunks = len(chunks)
    completed_chunks = min(progress.cleared, total_chunks)
    
    for i, chunk in enumerate(chunks):
        topic = categorize_topic(chunk.text)
        
        if topic not in topic_performance:
            topic_performance[topic] = {
                'completed': 0,
                'total': 0,
                'completion_rate': 0
            }
        
        topic_performance[topic]['total'] += 1
        if i < completed_chunks:
            topic_performance[topic]['completed'] += 1
    
    # Calculate completion rates
    for topic, stats in topic_performance.items():
        stats['completion_rate'] = (stats['completed'] / stats['total']) * 100 if stats['total'] > 0 else 0
    
    # Find best and worst topics
    if topic_performance:
        best_topic = max(topic_performance.keys(), key=lambda t: topic_performance[t]['completion_rate'])
        worst_topic = min(topic_performance.keys(), key=lambda t: topic_performance[t]['completion_rate'])
        
        return {
            'topic_performance': topic_performance,
            'best_topic': best_topic,
            'worst_topic': worst_topic,
            'total_chunks': total_chunks,
            'completed_chunks': completed_chunks,
            'overall_completion': (completed_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        }
    
    return {"message": "No performance data available"}

def generate_question(chunk_text, question_type="choice"):
    """Generate a multiple choice question using OpenAI - no hardcoded fallbacks"""
    client = get_openai_client()
    
    if not client:
        return {
            "type": "choice",
            "question": "OpenAI API not configured - cannot generate questions",
            "options": [
                "Please configure OpenAI API key",
                "Service temporarily unavailable", 
                "Check your API configuration",
                "Try again later"
            ],
            "correct": 0,
            "explanation": "OpenAI API is required for dynamic question generation. Please configure your API key."
        }
    
    # Extract important concepts to guide question generation
    important_concepts = extract_important_concepts(chunk_text)
    
    prompt = f"""
    Create a challenging and educational multiple choice question from this text.
    Focus on testing deep understanding, critical thinking, and analysis rather than simple memorization.
    
    TEXT TO ANALYZE:
    {chunk_text[:3000]}
    
    KEY CONCEPTS TO FOCUS ON: {', '.join(important_concepts) if important_concepts else 'main ideas and relationships'}
    
    QUESTION REQUIREMENTS:
    - Test analytical thinking: WHY, HOW, WHAT IF, or cause-and-effect scenarios
    - Focus on understanding relationships, implications, or applications
    - Avoid simple factual recall - make it thought-provoking
    - Keep question concise but clear (maximum 20 words)
    - Base everything strictly on the provided text content
    
    ANSWER OPTIONS REQUIREMENTS:
    - Generate exactly 4 sophisticated and plausible options
    - Make incorrect options believable but clearly wrong to someone who understands
    - Base distractors on common misconceptions or partial understanding
    - Ensure all options have similar complexity and length
    - Make the question genuinely educational
    
    EXPLANATION REQUIREMENTS:
    - Provide a comprehensive explanation of why the correct answer is right
    - Briefly explain why the other options are incorrect
    - Help reinforce the key learning concepts
    
    IMPORTANT: Base everything on the actual text content. Do not add external knowledge.
    
    Return your response as valid JSON in this exact format:
    {{
        "type": "choice",
        "question": "Your analytical question here",
        "options": [
            "Sophisticated correct option",
            "Plausible but incorrect option", 
            "Another believable distractor",
            "Final convincing wrong answer"
        ],
        "correct": 0,
        "explanation": "Detailed explanation of the correct answer and why others are wrong, based on the text"
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=600
        )
        
        # Clean the response content
        content = response.choices[0].message.content.strip()
        
        # Remove any markdown formatting if present
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            content = content.strip()
        
        # Parse JSON
        result = json.loads(content)
        
        # Validate the response structure
        required_keys = ["type", "question", "options", "correct", "explanation"]
        if not all(key in result for key in required_keys):
            raise ValueError(f"Missing required keys. Got: {list(result.keys())}")
        
        if len(result["options"]) != 4:
            raise ValueError(f"Must have exactly 4 options, got {len(result['options'])}")
        
        if not (0 <= result["correct"] <= 3):
            raise ValueError(f"Correct answer index must be 0-3, got {result['correct']}")
        
        # Shuffle the options to randomize correct answer position
        import random
        options = result["options"]
        correct_answer = options[result["correct"]]
        
        # Create a list of (option, is_correct) pairs
        option_pairs = [(option, i == result["correct"]) for i, option in enumerate(options)]
        
        # Use deterministic shuffle based on chunk text hash
        # This ensures the same chunk always produces the same question order
        import hashlib
        chunk_hash = hashlib.md5(chunk_text.encode()).hexdigest()
        random.seed(int(chunk_hash[:8], 16))  # Use first 8 chars of hash as seed
        random.shuffle(option_pairs)
        random.seed()  # Reset random seed
        
        # Extract shuffled options and find new correct index
        shuffled_options = [pair[0] for pair in option_pairs]
        new_correct_index = next(i for i, pair in enumerate(option_pairs) if pair[1])
        
        # Update result with shuffled data
        result["options"] = shuffled_options
        result["correct"] = new_correct_index
        
        # Ensure type is set correctly
        result["type"] = question_type
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw response: {content}")
        return generate_emergency_fallback(chunk_text)
    except Exception as e:
        print(f"Error generating question with OpenAI: {e}")
        return generate_emergency_fallback(chunk_text)

def generate_question_with_context(chunk_text, question_type="choice", question_number=1, total_questions=3):
    """Generate a question with context about which question this is in the sequence"""
    client = get_openai_client()
    
    if not client:
        return generate_emergency_fallback(chunk_text)
    
    # Extract important concepts to guide question generation
    important_concepts = extract_important_concepts(chunk_text)
    
    # Adjust question focus based on question number
    focus_instructions = {
        1: "Focus on fundamental concepts and main ideas",
        2: "Focus on relationships, implications, or applications", 
        3: "Focus on analysis, evaluation, or synthesis of concepts"
    }
    
    current_focus = focus_instructions.get(question_number, "Focus on key concepts and understanding")
    
    prompt = f"""
    Create a challenging and educational multiple choice question from this text.
    This is question {question_number} of {total_questions} for this section.
    
    TEXT TO ANALYZE:
    {chunk_text[:3000]}
    
    KEY CONCEPTS TO FOCUS ON: {', '.join(important_concepts) if important_concepts else 'main ideas and relationships'}
    
    QUESTION FOCUS FOR THIS SEQUENCE POSITION:
    {current_focus}
    
    QUESTION REQUIREMENTS:
    - Test analytical thinking: WHY, HOW, WHAT IF, or cause-and-effect scenarios
    - Avoid repeating similar question types from previous questions in this section
    - Keep question concise but clear (maximum 20 words)
    - Base everything strictly on the provided text content
    - Make this question distinct from typical question {question_number} patterns
    
    ANSWER OPTIONS REQUIREMENTS:
    - Generate exactly 4 sophisticated and plausible options
    - Make incorrect options believable but clearly wrong to someone who understands
    - Base distractors on common misconceptions or partial understanding
    - Ensure all options have similar complexity and length
    
    EXPLANATION REQUIREMENTS:
    - Provide a comprehensive explanation of why the correct answer is right
    - Briefly explain why the other options are incorrect
    - Include a helpful hint for students who get it wrong
    
    Return your response as valid JSON in this exact format:
    {{
        "type": "choice",
        "question": "Your analytical question here",
        "options": [
            "Sophisticated correct option",
            "Plausible but incorrect option", 
            "Another believable distractor",
            "Final convincing wrong answer"
        ],
        "correct": 0,
        "explanation": "Detailed explanation of the correct answer and why others are wrong",
        "hint": "Helpful hint for students who get this wrong"
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=700
        )
        
        # Clean the response content
        content = response.choices[0].message.content.strip()
        
        # Remove any markdown formatting if present
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        # Parse JSON
        result = json.loads(content)
        
        # Validate the response structure
        required_keys = ["type", "question", "options", "correct", "explanation"]
        if not all(key in result for key in required_keys):
            raise ValueError(f"Missing required keys. Got: {list(result.keys())}")
        
        if len(result["options"]) != 4:
            raise ValueError(f"Must have exactly 4 options, got {len(result['options'])}")
        
        if not (0 <= result["correct"] <= 3):
            raise ValueError(f"Correct answer index must be 0-3, got {result['correct']}")
        
        # Shuffle the options to randomize correct answer position
        import random
        options = result["options"]
        correct_answer = options[result["correct"]]
        
        # Create a list of (option, is_correct) pairs
        option_pairs = [(option, i == result["correct"]) for i, option in enumerate(options)]
        
        # Use deterministic shuffle based on chunk text hash
        # This ensures the same chunk always produces the same question order
        import hashlib
        chunk_hash = hashlib.md5(chunk_text.encode()).hexdigest()
        random.seed(int(chunk_hash[:8], 16))  # Use first 8 chars of hash as seed
        random.shuffle(option_pairs)
        random.seed()  # Reset random seed
        
        # Extract shuffled options and find new correct index
        shuffled_options = [pair[0] for pair in option_pairs]
        new_correct_index = next(i for i, pair in enumerate(option_pairs) if pair[1])
        
        # Update result with shuffled data
        result["options"] = shuffled_options
        result["correct"] = new_correct_index
        
        # Ensure type is set correctly and add hint if not present
        result["type"] = question_type
        if "hint" not in result:
            result["hint"] = "Think about the key concepts mentioned in the text and how they relate to each other."
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return generate_emergency_fallback(chunk_text)
    except Exception as e:
        print(f"Error generating question with OpenAI: {e}")
        return generate_emergency_fallback(chunk_text)

def generate_emergency_fallback(chunk_text):
    """Emergency fallback when OpenAI completely fails"""
    # Extract first meaningful sentence for context
    sentences = [s.strip() for s in chunk_text.split('.') if s.strip() and len(s.strip()) > 20]
    context = sentences[0][:150] + "..." if sentences else "the provided content"
    
    return {
        "type": "choice",
        "question": "What is the main focus of this section?",
        "options": [
            "The specific content described in the text",
            "General background information only",
            "Unrelated technical specifications", 
            "Abstract theoretical concepts only"
        ],
        "correct": 0,
        "explanation": f"This section focuses on: {context}",
        "hint": "Look for the main topic or theme discussed in the text."
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

def generate_completion_message(user_id, doc_id, db):
    """Generate a simple completion message based on user performance"""
    progress = db.query(Progress).filter_by(doc_id=doc_id, user_id=user_id).first()
    chunks = db.query(Chunk).filter_by(doc_id=doc_id).order_by(Chunk.idx).all()
    
    if not progress or not chunks:
        return "Congratulations on completing the document! Great job learning!"
    
    total_chunks = len(chunks)
    completed_chunks = min(progress.cleared, total_chunks)
    completion_rate = (completed_chunks / total_chunks) * 100 if total_chunks > 0 else 0
    
    # Simple completion messages based on performance
    if completion_rate >= 90:
        return f"🎉 Outstanding work! You completed {completed_chunks} out of {total_chunks} sections and earned {progress.xp} XP with a {progress.streak}-question streak. You've shown excellent understanding of the material!"
    elif completion_rate >= 70:
        return f"🌟 Great job! You completed {completed_chunks} out of {total_chunks} sections and earned {progress.xp} XP. Your {progress.streak}-question streak shows good consistency. Keep up the excellent work!"
    elif completion_rate >= 50:
        return f"👍 Good progress! You completed {completed_chunks} out of {total_chunks} sections and earned {progress.xp} XP. You're building good learning momentum with your efforts!"
    else:
        return f"🚀 Nice start! You completed {completed_chunks} out of {total_chunks} sections and earned {progress.xp} XP. Every step forward is progress - keep going!"

def find_relevant_chunks(query, chunks):
    """Find the most relevant chunks for a given query using keyword matching"""
    query_words = set(word.lower().strip('.,!?;:') for word in query.split() if len(word) > 2)
    
    chunk_scores = []
    for chunk in chunks:
        chunk_words = set(word.lower().strip('.,!?;:') for word in chunk.text.split())
        
        # Calculate relevance score based on keyword overlap
        common_words = query_words.intersection(chunk_words)
        score = len(common_words)
        
        # Boost score for exact phrase matches
        if query.lower() in chunk.text.lower():
            score += 5
        
        # Boost score for partial phrase matches
        for word in query_words:
            if word in chunk.text.lower():
                score += 1
        
        chunk_scores.append((chunk, score))
    
    # Sort by relevance score and return top chunks
    chunk_scores.sort(key=lambda x: x[1], reverse=True)
    
    # Return top 3 most relevant chunks, or all chunks if less than 3
    relevant_chunks = [chunk for chunk, score in chunk_scores[:3] if score > 0]
    
    # If no relevant chunks found, return first 2 chunks as fallback
    if not relevant_chunks:
        relevant_chunks = chunks[:2]
    
    return relevant_chunks

def generate_enhanced_fallback_answer(query, document_text, document_title):
    """Generate an enhanced answer when LLM is not available"""
    query_lower = query.lower()
    
    # Advanced keyword search with context
    sentences = [s.strip() for s in document_text.split('.') if s.strip()]
    relevant_sentences = []
    
    # Score sentences based on relevance
    sentence_scores = []
    query_words = [word for word in query_lower.split() if len(word) > 2]
    
    for sentence in sentences:
        sentence_lower = sentence.lower()
        score = 0
        
        # Count keyword matches
        for word in query_words:
            if word in sentence_lower:
                score += 1
        
        # Boost for exact phrase matches
        if len(query_words) > 1:
            query_phrase = ' '.join(query_words[:3])  # First 3 words
            if query_phrase in sentence_lower:
                score += 3
        
        if score > 0:
            sentence_scores.append((sentence, score))
    
    # Sort by relevance and get top sentences
    sentence_scores.sort(key=lambda x: x[1], reverse=True)
    relevant_sentences = [sentence for sentence, score in sentence_scores[:3]]
    
    if relevant_sentences:
        # Create a coherent answer from relevant sentences
        answer = '. '.join(relevant_sentences)
        if len(answer) > 400:
            answer = answer[:400] + "..."
        
        return jsonify({
            "answer": answer,
            "source_chunks": len(relevant_sentences),
            "document_title": document_title,
            "confidence": "medium"
        })
    else:
        return jsonify({
            "answer": f"I couldn't find specific information about '{query}' in {document_title}. The document may not contain details about this topic, or you might want to try rephrasing your question with different keywords.",
            "source_chunks": 0,
            "document_title": document_title,
            "confidence": "low"
        })

def generate_fallback_answer(query, document_text):
    """Legacy fallback function for compatibility"""
    return generate_enhanced_fallback_answer(query, document_text, "Document")

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
                
                # Create chunks only (questions will be generated dynamically)
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
                    # No task creation - questions will be generated dynamically
                
                # Create initial progress record
                progress = Progress(
                    user_id=1,  # Default user for now
                    doc_id=doc.id,
                    cleared=0
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
            
            # Check if all chunks are completed
            if progress.cleared >= len(chunks):
                return jsonify({'done': True})
            
            current_chunk = chunks[progress.cleared]
            
            # Generate fresh question dynamically for this chunk
            question_data = generate_question(current_chunk.text, 'choice')
            
            # Get document for preview
            doc = db.query(Doc).filter_by(id=pdf_id).first()
            full_text = ""
            if doc:
                # Get all chunks in order to reconstruct full text
                all_chunks = db.query(Chunk).filter_by(doc_id=pdf_id).order_by(Chunk.idx).all()
                full_text = "\n\n".join([chunk.text for chunk in all_chunks])
            
            return jsonify({
                'chunk': current_chunk.text,
                'task': question_data,
                'task_type': 'choice',
                'is_boss': False,  # No boss battles
                'idx': progress.cleared,
                'difficulty': current_chunk.difficulty,
                'document_text': full_text,
                'document_title': doc.title if doc else "Document",
                'question_progress': {
                    'current_question': progress.current_chunk_question + 1,
                    'total_questions': progress.questions_per_chunk,
                    'chunk_number': progress.cleared + 1,
                    'total_chunks': len(chunks)
                }
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
            
            # Get progress and current chunk
            progress = db.query(Progress).filter_by(doc_id=pdf_id, user_id=1).first()
            if not progress:
                return jsonify({'error': 'Document not found'}), 404
            
            chunks = db.query(Chunk).filter_by(doc_id=pdf_id).order_by(Chunk.idx).all()
            if progress.cleared >= len(chunks):
                return jsonify({'error': 'All chunks completed'}), 400
            
            current_chunk = chunks[progress.cleared]
            
            # Generate the current question to validate against
            current_question = generate_question(current_chunk.text, 'choice')
            
            # Handle skip
            if is_skip:
                # Move to next chunk (since we only have 1 question per chunk)
                progress.cleared += 1
                progress.current_chunk_question = 0
                db.commit()
                
                return jsonify({
                    'correct': False,
                    'explanation': 'Question skipped. Try to answer the next one!',
                    'new_progress': progress.cleared,
                    'total_chunks': len(chunks)
                })
            
            # Validate answer (only multiple choice now)
            is_correct = False
            score = 0
            explanation = ""
            
            try:
                selected_option = int(user_answer)
                correct_option = current_question.get('correct', 0)
                is_correct = selected_option == correct_option
                score = 100 if is_correct else 0
                
                # Get detailed explanation from OpenAI
                explanation = validate_answer_with_openai(
                    selected_option, 
                    correct_option, 
                    current_question.get('question', ''),
                    current_question.get('options', []),
                    current_chunk.text
                )
                
            except (ValueError, TypeError):
                is_correct = False
                score = 0
                explanation = "Please select a valid option."
            
            # Update progress based on answer correctness
            if is_correct:
                # Move to next chunk (since we only have 1 question per chunk)
                progress.cleared += 1
                progress.current_chunk_question = 0
            
            db.commit()
            
            # Get hint for incorrect answers
            hint = ""
            if not is_correct and 'hint' in current_question:
                hint = current_question['hint']
            
            # Get performance analysis
            performance_analysis = analyze_user_performance(1, pdf_id, db)
            
            return jsonify({
                'correct': is_correct,
                'explanation': explanation,
                'hint': hint,
                'new_progress': progress.cleared,
                'total_chunks': len(chunks)
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
    
    @app.route("/api/completion-message/<int:pdf_id>", methods=["GET"])
    def get_completion_message(pdf_id):
        """Generate completion summary with statistics"""
        db = SessionLocal()
        try:
            # Get user's attempts for this document
            attempts = db.query(Attempt).join(Task).filter(
                Task.doc_id == pdf_id,
                Attempt.user_id == 1
            ).all()
            
            if not attempts:
                return jsonify({
                    'message': 'Great job completing the document!',
                    'stats': {
                        'correct': 0,
                        'wrong': 0,
                        'skipped': 0,
                        'average_time': 0
                    }
                })
            
            # Calculate statistics
            correct_count = sum(1 for attempt in attempts if attempt.correct)
            wrong_count = sum(1 for attempt in attempts if not attempt.correct and not attempt.is_skip)
            skipped_count = sum(1 for attempt in attempts if attempt.is_skip)
            
            # Calculate average time (excluding skips with 0 time)
            times = [attempt.time_ms for attempt in attempts if attempt.time_ms > 0]
            average_time = sum(times) / len(times) if times else 0
            average_time_seconds = round(average_time / 1000, 1)  # Convert to seconds
            
            total_questions = len(attempts)
            accuracy = (correct_count / total_questions * 100) if total_questions > 0 else 0
            
            # Generate simple completion message
            message = f"🎉 Congratulations! You completed the document with {accuracy:.0f}% accuracy. "
            
            if correct_count > wrong_count:
                message += "Excellent work on your understanding!"
            elif correct_count == wrong_count:
                message += "Good effort! Keep practicing to improve."
            else:
                message += "Great attempt! Review the material to strengthen your knowledge."
            
            return jsonify({
                'message': message,
                'stats': {
                    'correct': correct_count,
                    'wrong': wrong_count,
                    'skipped': skipped_count,
                    'average_time': average_time_seconds
                }
            })
                
        finally:
            db.close()
    

    @app.route('/api/query/<int:pdf_id>', methods=['POST'])
    def query_document(pdf_id):
        """Enhanced document querying with advanced LLM assistance"""
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
            chunks = db.query(Chunk).filter(Chunk.doc_id == pdf_id).order_by(Chunk.idx).all()
            document_text = "\n\n".join([chunk.text for chunk in chunks])
            
            # Find most relevant chunks for the query
            relevant_chunks = find_relevant_chunks(query, chunks)
            relevant_text = "\n\n".join([chunk.text for chunk in relevant_chunks])
            
            # Generate enhanced answer using LLM
            client = get_openai_client()
            if client:
                try:
                    prompt = f"""
                    You are an intelligent document assistant. Answer the user's question based on the provided document content.
                    
                    DOCUMENT CONTENT:
                    {relevant_text[:6000]}
                    
                    USER QUESTION: {query}
                    
                    INSTRUCTIONS:
                    - Provide a comprehensive yet concise answer (3-5 sentences)
                    - Use ONLY information from the document provided
                    - If the information isn't in the document, clearly state this
                    - Include specific details, numbers, or examples when available
                    - Structure your answer logically and clearly
                    - If the question has multiple parts, address each part
                    - Use natural, conversational language
                    
                    RESPONSE FORMAT:
                    - Start with a direct answer to the main question
                    - Follow with supporting details from the document
                    - End with any relevant context or implications if appropriate
                    """
                    
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.2,
                        max_tokens=300
                    )
                    
                    answer = response.choices[0].message.content.strip()
                    
                    # Add metadata about the response
                    return jsonify({
                        "answer": answer,
                        "source_chunks": len(relevant_chunks),
                        "document_title": doc.title,
                        "confidence": "high" if len(relevant_chunks) >= 2 else "medium"
                    })
                    
                except Exception as e:
                    print(f"Error with OpenAI: {e}")
                    # Fallback to enhanced text search
                    return generate_enhanced_fallback_answer(query, document_text, doc.title)
            else:
                # Enhanced fallback when OpenAI is not available
                return generate_enhanced_fallback_answer(query, document_text, doc.title)
                
        except Exception as e:
            print(f"Error querying document: {e}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5002)  # Use port 5002 to avoid conflicts
