# EchoDeck Setup Instructions

## Backend Setup

1. **Set up Python virtual environment:**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure OpenAI API Key:**
   - Get your API key from: https://platform.openai.com/account/api-keys
   - Create a `.env` file in the backend directory:
   ```bash
   echo "OPENAI_API_KEY=your-actual-api-key-here" > backend/.env
   ```

3. **Start the backend server:**
   ```bash
   cd backend
   source .venv/bin/activate
   python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Current Status

✅ Backend server running on port 8000
✅ Frontend server running on port 5173
✅ Fixed validation errors in presentation generation
✅ Updated presentation styles to match backend expectations

## Notes

- The application will work with mock data if no OpenAI API key is provided
- To enable real transcription and presentation generation, add your OpenAI API key to the `.env` file
- All presentation styles (creative, professional, academic, casual) are now properly configured

