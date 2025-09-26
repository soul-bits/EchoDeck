// Enums and Union Types (defined first to avoid circular dependencies)
export type PresentationStyle = 'professional' | 'creative' | 'academic' | 'casual';
export type ExportFormat = 'pdf' | 'pptx' | 'html' | 'video';
export type QualitySetting = 'standard' | 'high';
export type ProcessingStatus = 'idle' | 'uploading' | 'transcribing' | 'generating' | 'completed' | 'error';

// Data Models
export interface Slide {
  order: number;
  title: string;
  content: string[];
  speaker_notes?: string;
  image_path?: string;
  dalle_prompt?: string;
}

export interface Presentation {
  id: string;
  title: string;
  style: PresentationStyle;
  transcript?: string;
  created_at: string;
  status: 'processing' | 'completed' | 'failed';
  slides?: Slide[];
}

export interface SessionData {
  session_id: string;
  audio_file?: File;
  style?: PresentationStyle;
  transcript?: {
    text: string;
    duration_seconds: number;
    created_at: string;
    status: 'completed' | 'processing' | 'failed';
  };
  presentation?: Presentation;
}

// API Response Types
export interface AudioUploadResponse {
  upload_id: string;
  status: 'processing' | 'completed' | 'failed';
  transcript?: {
    text: string;
    duration_seconds: number;
    created_at: string;
  };
}

export interface PresentationGenerationResponse {
  presentation_id: string;
  status: 'processing' | 'completed' | 'failed';
  storyboard?: Slide[];
}

export interface SlideUpdateResponse {
  slide: Slide;
  status: 'success' | 'error';
}

export interface ExportResponse {
  export_url: string;
  file_size: number;
  expires_at: string;
}

// API Request Types
export interface AudioUploadRequest {
  audio_file: File;
  style?: PresentationStyle;
}

export interface PresentationGenerationRequest {
  upload_id: string;
  style: PresentationStyle;
  slide_count?: number;
}

export interface SlideUpdateRequest {
  title?: string;
  content?: string[];
}

export interface ExportRequest {
  format: ExportFormat;
  quality?: QualitySetting;
}

// Component Props Types
export interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number;
}

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[];
  maxSize: number;
}

export interface SlidePreviewProps {
  slide: Slide;
  onEdit?: (slide: Slide) => void;
  isEditable?: boolean;
}

export interface ProcessingStatusProps {
  status: ProcessingStatus;
  currentStep?: string;
  estimatedTime?: number;
}

// Utility Types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}