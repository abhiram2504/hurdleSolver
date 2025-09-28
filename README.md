# 🎯 Hurdle Solver

An intelligent PDF learning platform that transforms documents into interactive, AI-powered educational experiences. Upload any PDF and engage with dynamically generated questions that test your understanding and critical thinking skills.

![Hurdle Solver Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Python](https://img.shields.io/badge/Python-3.13-blue) ![React](https://img.shields.io/badge/React-18.x-blue) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5-orange)

## 🌟 Features

### 📚 **Smart Document Processing**
- **PDF Upload & Analysis**: Automatically extracts and processes text from PDF documents
- **Intelligent Chunking**: Dynamically divides content into digestible learning modules
- **Content Understanding**: AI analyzes document structure and key concepts

### 🧠 **AI-Powered Question Generation**
- **Dynamic Questions**: Fresh, challenging questions generated for each learning session
- **Multiple Choice Format**: 4-option questions with sophisticated distractors
- **Analytical Focus**: Questions test understanding, not just memorization
- **Deterministic Consistency**: Same content produces consistent question ordering

### 🎮 **Interactive Learning Experience**
- **Buckeye Avatar**: Animated mascot provides feedback and encouragement
- **Story Progress System**: Duolingo-style progress tracking with visual nodes
- **Real-time Feedback**: Immediate responses with explanations and hints
- **Skip Option**: Flexibility to skip challenging questions

### 📊 **Performance Analytics**
- **Completion Statistics**: Track correct, wrong, and skipped questions
- **Time Analysis**: Monitor average time per question
- **Progress Tracking**: Visual representation of learning journey
- **Summary Reports**: Comprehensive performance overview upon completion

### 💬 **Document Interaction**
- **AI-Powered Queries**: Ask questions about the document content
- **Contextual Answers**: LLM provides relevant, document-based responses
- **Smart Retrieval**: Finds and references relevant document sections

## 🏗️ Architecture

### **Backend (Python/Flask)**
- **Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite for local development
- **AI Integration**: OpenAI GPT-3.5 for question generation and document querying
- **PDF Processing**: PyPDF2 for text extraction
- **Text Analysis**: textstat and nltk for content analysis

### **Frontend (React/TypeScript)**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Custom CSS with scarlet and gray theme
- **Components**: Modular architecture with reusable components
- **State Management**: Custom hooks for game state and UI management

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 18+
- OpenAI API Key

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure OpenAI API key
python setup_env.py

# Start the server
python app_clean.py
```

The backend will start on `http://localhost:5002`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
```

The frontend will start on `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### OpenAI API Key Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Run the setup script: `python setup_env.py`
3. Follow the prompts to configure your API key

## 📖 Usage Guide

### 1. **Upload a PDF**
- Click the upload button on the home screen
- Select a PDF document (educational content works best)
- Wait for processing and chunking

### 2. **Start Learning**
- Navigate through questions using the story progress interface
- Read each question carefully and select your answer
- Get immediate feedback with explanations
- Use hints when available for incorrect answers

### 3. **Document Interaction**
- Use the document query feature to ask specific questions
- Get AI-powered answers based on the document content
- Explore concepts in greater depth

### 4. **Track Progress**
- Monitor your advancement through the visual progress system
- View detailed statistics upon completion
- Review performance metrics and improvement areas

## 🎨 User Interface

### **Color Theme**
- **Primary**: Scarlet (#DC2626) and Gray (#6B7280)
- **Success**: Green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Error**: Red (#EF4444)

### **Key Components**
- **Buckeye Avatar**: Animated mascot with multiple moods
- **Story Progress**: Visual learning path with interactive nodes
- **Question Cards**: Clean, focused question presentation
- **Statistics Modal**: Comprehensive performance analytics

## 🔍 API Endpoints

### Document Management
- `POST /api/upload` - Upload and process PDF
- `GET /api/hurdle/{pdf_id}` - Get current question
- `POST /api/hurdle/{pdf_id}` - Submit answer

### Analytics
- `GET /api/completion-message/{pdf_id}` - Get completion statistics
- `POST /api/query/{pdf_id}` - Query document content

### Health
- `GET /health` - Server health check

## 🗄️ Database Schema

### **Core Models**
- **User**: User management
- **Doc**: Document metadata and storage paths
- **Chunk**: Text segments with difficulty ratings
- **Progress**: User progress tracking
- **Attempt**: Answer submissions with timing data

## 🛠️ Development

### **Backend Development**
```bash
# Run with debug mode
python app_clean.py

# Database operations
python -c "from models import *; Base.metadata.create_all(engine)"
```

### **Frontend Development**
```bash
# Development server with hot reload
npm run dev

# Type checking
npm run build

# Linting
npm run lint
```

## 🔬 Testing

### Manual Testing Checklist
- [ ] PDF upload and processing
- [ ] Question generation and display
- [ ] Answer submission and validation
- [ ] Progress tracking
- [ ] Document querying
- [ ] Statistics calculation
- [ ] Avatar animations and feedback

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
# Use production WSGI server like Gunicorn
pip install gunicorn
gunicorn app_clean:app
```

### Environment Considerations
- Set `DEBUG=False` for production
- Use PostgreSQL or MySQL for production database
- Configure proper CORS settings
- Set up reverse proxy (nginx)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-3.5 API
- **React Team** for the excellent frontend framework
- **Flask Community** for the lightweight backend framework
- **The Ohio State University** for inspiration (Buckeye mascot theme)

## 📞 Support

For support, please open an issue on GitHub

---

