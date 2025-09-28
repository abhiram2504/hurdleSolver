"""
HurdleReader Backend - AI-Powered Educational Gamification
"""
import os
import json
import PyPDF2
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenAI client (will be set up later if API key is available)
openai_client = None

def get_openai_client():
    """Initialize and return OpenAI client if API key is available"""
    global openai_client
    if openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            openai_client = OpenAI(api_key=api_key)
    return openai_client

# In-memory storage for MVP
pdf_storage = {}
current_pdf_id = 1

def extract_pdf_text(file_path):
    """Extract text from PDF using PyPDF2"""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

def create_educational_chunks(text, num_chunks=5):
    """Use GPT to create educational chunks from PDF text"""
    prompt = f"""
    Break down the following text into {num_chunks} educational chunks for a gamified learning app.
    Each chunk should:
    - Be 100-200 words
    - Focus on key concepts
    - Be self-contained learning units
    - Progress from basic to advanced concepts
    
    Return as JSON array with format:
    [{{"chunk": "text content", "key_concepts": ["concept1", "concept2"], "difficulty": 1-5}}]
    
    Text to chunk:
    {text[:3000]}...
    """
    
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI API key not configured")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        chunks_json = response.choices[0].message.content
        chunks = json.loads(chunks_json)
        return chunks
    except Exception as e:
        print(f"Error creating chunks: {e}")
        # Fallback to simple text splitting
        words = text.split()
        chunk_size = len(words) // num_chunks
        return [
            {
                "chunk": " ".join(words[i*chunk_size:(i+1)*chunk_size]),
                "key_concepts": ["general"],
                "difficulty": min(i+1, 5)
            }
            for i in range(num_chunks)
        ]

def generate_interactive_game(chunk_data, game_type):
    """Generate interactive game data using GPT"""
    chunk = chunk_data["chunk"]
    concepts = chunk_data.get("key_concepts", [])
    
    if game_type == "matching":
        prompt = f"""
        Create a matching game from this text. Extract 4-6 key terms and their definitions.
        
        Text: {chunk}
        
        Return JSON: {{
            "type": "matching",
            "concepts": [
                {{"term": "concept1", "definition": "definition1"}},
                {{"term": "concept2", "definition": "definition2"}}
            ],
            "definitions": ["definition1", "definition2"]
        }}
        """
   
    elif game_type == "choice":
        prompt = f"""
        Create a short multiple choice question about this text. 
        
        Text: {chunk}
        
        Requirements:
        - Question must be ONE line only (max 15 words)
        - Must have exactly 4 options (A, B, C, D)
        - One correct answer
        - Options should be short and clear
        
        Return JSON: {{"type": "choice", "question": "Question about an important topic", "options": ["Option A", "Option B", "Option C", "Option D"], "correct": 0, "explanation": "brief explanation"}}
        """
    else:  # cloze
        prompt = f"""
        Create a short fill-in-the-blank question from this text. Keep it to ONE LINE only.
        
        Text: {chunk}
        
        Requirements:
        - Question must be ONE line only (max 15 words)
        - Use _____ for the blank
        - Answer should be one or two words maximum
        
        Return JSON: {{"type": "cloze", "question": "Short sentence with _____ blank.", "answer": "correct word", "hint": "brief hint"}}
        """
    
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI API key not configured")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        game_data = json.loads(response.choices[0].message.content)
        return game_data
    except Exception as e:
        print(f"Error generating interactive game: {e}")
        # Fallback game data
        return {
            "type": game_type,
            "question": "What is the main concept in this text?",
            "answer": "Key concept",
            "hint": "Look for important terms"
        }

def validate_answer_with_ai(user_answer, correct_answer, question, chunk_text):
    """Use AI to validate user answers and provide feedback"""
    prompt = f"""
    A student answered a question about this text. Evaluate their answer and provide feedback.
    
    Text: {chunk_text}
    Question: {question}
    Correct Answer: {correct_answer}
    Student Answer: {user_answer}
    
    Return JSON: {{
        "is_correct": true/false,
        "score": 0-100,
        "feedback": "detailed feedback explaining why correct/incorrect",
        "explanation": "explanation of the correct answer"
    }}
    """
    
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI API key not configured")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error validating answer: {e}")
        # Fallback simple validation
        is_correct = str(user_answer).lower().strip() in str(correct_answer).lower()
        return {
            "is_correct": is_correct,
            "score": 100 if is_correct else 0,
            "feedback": "Good job!" if is_correct else "Try again!",
            "explanation": f"The correct answer is: {correct_answer}"
        }

def generate_boss_battle(chunks_data):
    """Generate comprehensive boss battle questions"""
    combined_text = " ".join([c["chunk"] for c in chunks_data])
    concepts = []
    for c in chunks_data:
        concepts.extend(c.get("key_concepts", []))
    
    prompt = f"""
    Create a comprehensive "boss battle" quiz based on these learning chunks.
    Include 3-5 challenging questions that test understanding of key concepts.
    
    Key concepts: {concepts}
    Text summary: {combined_text[:1000]}...
    
    Return JSON: {{
        "title": "Boss Battle: [Topic]",
        "questions": [
            {{"question": "text", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "why"}},
            ...
        ],
        "difficulty": 5
    }}
    """
    
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI API key not configured")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error generating boss battle: {e}")
        return {
            "title": "Boss Battle: Comprehension Check",
            "questions": [
                {
                    "question": "What was the main topic covered?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct": 0,
                    "explanation": "This covers the main concepts."
                }
            ],
            "difficulty": 5
        }


def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    # --------- Upload PDF & Create Doc ----------
    @app.post("/api/upload")
    def upload_doc():
        global current_pdf_id
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        try:
            # Save file temporarily
            upload_dir = os.getenv('UPLOAD_DIR', './uploads')
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, file.filename)
            file.save(file_path)
            
            # Extract text from PDF
            pdf_text = extract_pdf_text(file_path)
            
            # Create educational chunks using AI
            chunks_data = create_educational_chunks(pdf_text)
            
            # Store PDF data
            pdf_id = str(current_pdf_id)
            pdf_storage[pdf_id] = {
                'filename': file.filename,
                'chunks_data': chunks_data,
                'current_chunk': 0,
                'xp': 0,
                'streak': 0,
                'boss_battle': None
            }
            current_pdf_id += 1
            
            # Clean up file
            os.remove(file_path)
            
            return jsonify({
                'pdf_id': pdf_id, 
                'num_chunks': len(chunks_data),
                'title': f"Learning: {file.filename}"
            })
            
        except Exception as e:
            return jsonify({'error': f'Failed to process PDF: {str(e)}'}), 500


    # --------- Get Hurdle (chunk + task) ----------
    @app.get("/api/hurdle/<pdf_id>")
    def get_hurdle(pdf_id):
        if pdf_id not in pdf_storage:
            return jsonify({'error': 'PDF not found'}), 404
        
        pdf_data = pdf_storage[pdf_id]
        current_idx = pdf_data['current_chunk']
        chunks_data = pdf_data['chunks_data']
        
        if current_idx >= len(chunks_data):
            return jsonify({'done': True})
        
        # Check if it's a boss battle (every 5th hurdle)
        is_boss = (current_idx > 0 and (current_idx + 1) % 5 == 0)
        
        if is_boss:
            # Generate boss battle if not already created
            if not pdf_data.get('boss_battle'):
                boss_chunks = chunks_data[max(0, current_idx-4):current_idx+1]
                pdf_data['boss_battle'] = generate_boss_battle(boss_chunks)
            
            return jsonify({
                'chunk': f"Boss Battle Time! 🏆\n\n{pdf_data['boss_battle']['title']}",
                'task': pdf_data['boss_battle'],
                'task_type': 'boss',
                'is_boss': True,
                'idx': current_idx,
                'difficulty': 5
            })
        
        # Regular hurdle
        chunk_data = chunks_data[current_idx]
        game_types = ['choice', 'cloze']  # Only multiple choice and fill-in-the-blank
        game_type = game_types[current_idx % len(game_types)]
        
        # Generate interactive game
        task = generate_interactive_game(chunk_data, game_type)
        
        return jsonify({
            'chunk': chunk_data['chunk'],
            'task': task,
            'task_type': game_type,
            'is_boss': False,
            'idx': current_idx,
            'difficulty': chunk_data.get('difficulty', 1),
            'key_concepts': chunk_data.get('key_concepts', [])
        })

    # --------- Submit Hurdle ----------
    @app.post("/api/hurdle/<pdf_id>")
    def submit_hurdle(pdf_id):
        if pdf_id not in pdf_storage:
            return jsonify({'error': 'PDF not found'}), 404
        
        data = request.json or {}
        user_answer = data.get('answer', '')
        task_type = data.get('task_type', '')
        
        pdf_data = pdf_storage[pdf_id]
        current_idx = pdf_data['current_chunk']
        
        if current_idx >= len(pdf_data['chunks_data']):
            return jsonify({'error': 'No more chunks'}), 400
        
        chunk_data = pdf_data['chunks_data'][current_idx]
        chunk_text = chunk_data['chunk']
        
        # Get the current task data (we need to regenerate it to get correct answers)
        game_types = ['matching', 'choice']
        game_type = game_types[current_idx % len(game_types)]
        task = generate_interactive_game(chunk_data, game_type)
        
        # Validate answer using AI
        if task_type == 'choice' and task.get('correct') is not None:
            # For multiple choice, check if selected option matches correct index
            try:
                selected_option = int(user_answer)
                correct_answer_text = task['options'][task['correct']]
                is_correct = selected_option == task['correct']
                
                validation = {
                    'is_correct': is_correct,
                    'score': 100 if is_correct else 0,
                    'feedback': task.get('explanation', 'Good job!') if is_correct else f"Incorrect. {task.get('explanation', '')}",
                    'explanation': f"The correct answer is: {correct_answer_text}"
                }
            except (ValueError, IndexError):
                validation = {
                    'is_correct': False,
                    'score': 0,
                    'feedback': "Invalid answer format",
                    'explanation': "Please select a valid option"
                }
        elif task_type == 'matching':
            # For matching, validate each pair
            try:
                user_matches = json.loads(user_answer) if isinstance(user_answer, str) else user_answer
                correct_matches = {concept['term']: concept['definition'] for concept in task.get('concepts', [])}
                
                correct_count = 0
                for term, definition in user_matches.items():
                    if correct_matches.get(term) == definition:
                        correct_count += 1
                
                score = (correct_count / len(correct_matches)) * 100 if correct_matches else 0
                is_correct = score >= 70
                
                validation = {
                    'is_correct': is_correct,
                    'score': score,
                    'feedback': f"You got {correct_count}/{len(correct_matches)} matches correct!",
                    'explanation': f"Correct matches: {correct_matches}"
                }
            except:
                validation = {
                    'is_correct': False,
                    'score': 0,
                    'feedback': "Could not validate matching answers",
                    'explanation': "Please try again"
                }
        else:
            # Fallback: use AI to validate any other answer type
            question = task.get('question', 'What is the main concept?')
            correct_answer = task.get('answer', 'See explanation')
            validation = validate_answer_with_ai(user_answer, correct_answer, question, chunk_text)
        
        # Calculate points based on difficulty and score
        difficulty = chunk_data.get('difficulty', 1)
        points = int((validation['score'] / 100) * difficulty * 10)
        
        if validation['is_correct']:
            pdf_data['current_chunk'] += 1
            pdf_data['xp'] += points
            pdf_data['streak'] += 1
            pdf_data['boss_battle'] = None  # Reset boss battle for next one
        else:
            pdf_data['streak'] = 0
        
        return jsonify({
            'correct': validation['is_correct'],
            'score': validation['score'],
            'points_earned': points,
            'xp': pdf_data['xp'],
            'streak': pdf_data['streak'],
            'current': pdf_data['current_chunk'],
            'feedback': validation['feedback'],
            'explanation': validation['explanation'],
            'message': "Excellent! 🎉" if validation['is_correct'] else "Keep learning! 💪"
        })

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
