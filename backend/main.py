from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import aiofiles
from datetime import datetime
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our custom modules
from models import (
    AudioUploadResponse,
    PresentationGenerationResponse,
    PresentationGenerationRequest,
    SlideUpdateResponse,
    ExportResponse,
    Slide,
    Presentation,
    SlideUpdateRequest
)
from services.openai_service import OpenAIService
from services.file_service import FileService

# Initialize FastAPI app
app = FastAPI(
    title="EchoDeck API",
    description="Backend API for EchoDeck - Audio to Presentation Generator",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
openai_service = OpenAIService()
file_service = FileService()

# In-memory storage for demo (replace with database in production)
sessions = {}
presentations = {}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/audio/upload", response_model=AudioUploadResponse)
async def upload_audio(
    audio_file: UploadFile = File(...),
    style: Optional[str] = Form(None)
):
    """Upload audio file and start transcription"""
    try:
        # Validate file type - check both content type and file extension
        valid_audio_types = ['audio/', 'application/octet-stream']
        valid_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac']
        
        is_valid_content_type = any(audio_file.content_type.startswith(t) for t in valid_audio_types)
        is_valid_extension = any(audio_file.filename.lower().endswith(ext) for ext in valid_extensions) if audio_file.filename else False
        
        if not (is_valid_content_type or is_valid_extension):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Generate unique upload ID
        upload_id = str(uuid.uuid4())
        
        # Save uploaded file
        file_path = await file_service.save_audio_file(audio_file, upload_id)
        
        # Start transcription
        transcript_result = await openai_service.transcribe_audio(file_path)
        
        # Store session data
        sessions[upload_id] = {
            "upload_id": upload_id,
            "file_path": file_path,
            "transcript": transcript_result,
            "style": style or "professional",
            "created_at": datetime.now().isoformat(),
            "status": "completed"
        }
        
        return AudioUploadResponse(
            upload_id=upload_id,
            status="completed",
            transcript={
                "text": transcript_result["text"],
                "duration_seconds": transcript_result["duration"],
                "created_at": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/presentations/generate", response_model=PresentationGenerationResponse)
async def generate_presentation(request: PresentationGenerationRequest):
    """Generate presentation from uploaded audio"""
    try:
        # Check if session exists
        if request.upload_id not in sessions:
            raise HTTPException(status_code=404, detail="Upload session not found")
        
        session = sessions[request.upload_id]
        transcript_text = session["transcript"]["text"]
        
        # Generate presentation
        presentation_data = await openai_service.generate_presentation(
            transcript_text, request.style, request.slide_count
        )
        
        # Create presentation ID
        presentation_id = str(uuid.uuid4())
        
        # Store presentation (convert Pydantic models to dicts)
        slides_dict = [slide.dict() for slide in presentation_data["slides"]]
        presentations[presentation_id] = {
            "id": presentation_id,
            "title": presentation_data["title"],
            "style": request.style,
            "transcript": transcript_text,
            "created_at": datetime.now().isoformat(),
            "status": "completed",
            "slides": slides_dict
        }
        
        return PresentationGenerationResponse(
            presentation_id=presentation_id,
            status="completed",
            storyboard=presentation_data["slides"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/api/presentations/{presentation_id}/status", response_model=PresentationGenerationResponse)
async def get_presentation_status(presentation_id: str):
    """Get presentation status"""
    if presentation_id not in presentations:
        raise HTTPException(status_code=404, detail="Presentation not found")
    
    presentation = presentations[presentation_id]
    return PresentationGenerationResponse(
        presentation_id=presentation_id,
        status=presentation["status"],
        storyboard=presentation.get("slides", [])
    )

@app.put("/api/presentations/{presentation_id}/slides/{slide_id}", response_model=SlideUpdateResponse)
async def update_slide(
    presentation_id: str,
    slide_id: str,
    request: SlideUpdateRequest
):
    """Update a specific slide"""
    try:
        if presentation_id not in presentations:
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        presentation = presentations[presentation_id]
        slides = presentation["slides"]
        
        # Find slide by order (using slide_id as order)
        slide_order = int(slide_id)
        slide_found = None
        
        for slide in slides:
            if slide["order"] == slide_order:
                slide_found = slide
                break
        
        if not slide_found:
            raise HTTPException(status_code=404, detail="Slide not found")
        
        # Update slide
        if request.title is not None:
            slide_found["title"] = request.title
        if request.content is not None:
            slide_found["content"] = request.content
        
        # Convert dict back to Slide object for response
        updated_slide = Slide(**slide_found)
        return SlideUpdateResponse(
            slide=updated_slide,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.post("/api/presentations/{presentation_id}/export", response_model=ExportResponse)
async def export_presentation(
    presentation_id: str,
    format: str = "pdf",
    quality: str = "standard"
):
    """Export presentation to specified format"""
    try:
        if presentation_id not in presentations:
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        # For now, return a mock export URL
        # In production, this would generate actual files
        export_url = f"/api/exports/{presentation_id}.{format}"
        
        return ExportResponse(
            export_url=export_url,
            file_size=1024000,  # Mock file size
            expires_at=(datetime.now()).isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)