from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime

# Enums and Union Types
PresentationStyle = Literal['professional', 'creative', 'academic', 'casual']
ExportFormat = Literal['pdf', 'pptx', 'html', 'video']
QualitySetting = Literal['standard', 'high']
ProcessingStatus = Literal['idle', 'uploading', 'transcribing', 'generating', 'completed', 'error']

# Data Models
class Slide(BaseModel):
    order: int
    title: str
    content: List[str]
    speaker_notes: Optional[str] = None
    image_path: Optional[str] = None
    dalle_prompt: Optional[str] = None

class Presentation(BaseModel):
    id: str
    title: str
    style: PresentationStyle
    transcript: Optional[str] = None
    created_at: str
    status: Literal['processing', 'completed', 'failed']
    slides: Optional[List[Slide]] = None

class TranscriptData(BaseModel):
    text: str
    duration_seconds: float
    created_at: str
    status: Literal['completed', 'processing', 'failed'] = 'completed'

class SessionData(BaseModel):
    session_id: str
    transcript: Optional[TranscriptData] = None
    presentation: Optional[Presentation] = None

# API Response Types
class AudioUploadResponse(BaseModel):
    upload_id: str
    status: Literal['processing', 'completed', 'failed']
    transcript: Optional[TranscriptData] = None

class PresentationGenerationResponse(BaseModel):
    presentation_id: str
    status: Literal['processing', 'completed', 'failed']
    storyboard: Optional[List[Slide]] = None

class SlideUpdateResponse(BaseModel):
    slide: Slide
    status: Literal['success', 'error']

class ExportResponse(BaseModel):
    export_url: str
    file_size: int
    expires_at: str

# API Request Types
class AudioUploadRequest(BaseModel):
    style: Optional[PresentationStyle] = None

class PresentationGenerationRequest(BaseModel):
    upload_id: str
    style: PresentationStyle
    slide_count: Optional[int] = None

class SlideUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[List[str]] = None

class ExportRequest(BaseModel):
    format: ExportFormat
    quality: Optional[QualitySetting] = 'standard'

# Utility Types
class ApiError(BaseModel):
    message: str
    code: Optional[str] = None
    details: Optional[dict] = None

class UploadProgress(BaseModel):
    loaded: int
    total: int
    percentage: float

class HealthResponse(BaseModel):
    status: str
    timestamp: str