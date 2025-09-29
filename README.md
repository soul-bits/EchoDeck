# EchoDeck 🎤➡️📊

**AI-Powered Presentation Generator** - Transform your voice into polished presentations

EchoDeck is an intelligent system that converts spoken prompts into professional presentations across multiple formats (PDF, HTML, PowerPoint, and narrated videos). Built with modern web technologies and powered by OpenAI's suite of AI models.

## ✨ Features

### 🎯 Core Capabilities
- **Voice-to-Presentation**: Record or upload audio (up to 5 minutes) and get a complete presentation
- **Multi-Format Export**: Generate presentations in PDF, HTML, PowerPoint, and video formats
- **AI-Powered Content**: Uses GPT-4 for content generation and DALL-E 3 for visual creation
- **Smart Transcription**: Whisper API for accurate speech-to-text conversion
- **Interactive Editing**: Real-time preview and refinement of generated content

### 🎨 Presentation Styles
- **Creative**: Vibrant, engaging designs for creative presentations
- **Professional**: Clean, corporate-style layouts
- **Academic**: Research-focused, scholarly presentations
- **Casual**: Friendly, approachable designs

### 🔧 Technical Features
- **Real-time Processing**: Live preview during generation
- **Content Moderation**: Built-in safety checks using OpenAI's moderation API
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state
- **Routing**: React Router for navigation
- **Build Tool**: Vite for fast development and building

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for file uploads
- **AI Integration**: OpenAI API for content generation

### AI Services (Python)
- **Framework**: FastAPI for high-performance API
- **AI Models**: OpenAI GPT-4, Whisper, DALL-E 3
- **File Processing**: FFmpeg for audio/video processing
- **Image Generation**: Pillow for image manipulation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EchoDeck
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Install backend dependencies
   cd backend && pip install -r requirements.txt && cd ..
   ```

3. **Environment Setup**
   ```bash
   # Create environment file for backend
   echo "OPENAI_API_KEY=your-api-key-here" > backend/.env
   ```

4. **Start the development servers**
   ```bash
   # Start backend (Terminal 1)
   cd backend
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   
   # Start frontend (Terminal 2)
   cd frontend
   npm run dev
   
   # Start Node.js backend (Terminal 3)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 📁 Project Structure

```
EchoDeck/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   └── package.json
├── backend/                 # Python FastAPI backend
│   ├── services/           # AI and file processing services
│   ├── main.py            # FastAPI application entry point
│   └── requirements.txt
├── server/                 # Node.js Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API routes
│   └── index.ts           # Express server entry point
├── shared/                 # Shared TypeScript types
├── uploads/               # User uploaded files
├── exports/               # Generated presentations
└── design_guidelines.md   # Design system documentation
```

## 🎨 Design System

EchoDeck follows a comprehensive design system with:
- **Color Palette**: Professional blue theme with light/dark mode support
- **Typography**: Inter font family with clear hierarchy
- **Components**: Radix UI primitives with custom styling
- **Layout**: Responsive grid system with consistent spacing
- **Interactions**: Smooth transitions and loading states

See [design_guidelines.md](./design_guidelines.md) for detailed specifications.

## 🔧 Development

### Available Scripts

**Root level:**
- `npm run dev` - Start Node.js backend server
- `npm run build` - Build production bundle
- `npm run check` - TypeScript type checking

**Frontend:**
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Backend (Python):**
- `python -m uvicorn main:app --reload` - Start with auto-reload
- `pytest` - Run test suite

### Code Style
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Configured for React and TypeScript best practices
- **Prettier**: Code formatting (if configured)
- **Python**: Follows PEP 8 style guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing powerful AI models
- React and TypeScript communities for excellent tooling
- Tailwind CSS for the utility-first CSS framework
- Radix UI for accessible component primitives

---

**Built with ❤️ using React, TypeScript, Python, and OpenAI**
