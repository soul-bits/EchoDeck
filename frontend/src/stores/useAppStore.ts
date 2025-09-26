import { create } from 'zustand';
import { SessionData, ProcessingStatus, Presentation, Slide } from '../types';

interface AppState {
  // Session data
  currentSession: SessionData | null;
  processingStatus: ProcessingStatus;
  error: string | null;
  
  // UI state
  isRecording: boolean;
  recordingDuration: number;
  
  // Actions
  setCurrentSession: (session: SessionData | null) => void;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setError: (error: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  updatePresentation: (presentation: Presentation) => void;
  updateSlide: (slideIndex: number, slide: Slide) => void;
  resetSession: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentSession: null,
  processingStatus: 'idle',
  error: null,
  isRecording: false,
  recordingDuration: 0,

  // Actions
  setCurrentSession: (session) => set({ currentSession: session }),
  
  setProcessingStatus: (status) => set({ processingStatus: status }),
  
  setError: (error) => set({ error }),
  
  setIsRecording: (isRecording) => set({ isRecording }),
  
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),
  
  updatePresentation: (presentation) => {
    const { currentSession } = get();
    if (currentSession) {
      set({
        currentSession: {
          ...currentSession,
          presentation,
        },
      });
    }
  },
  
  updateSlide: (slideIndex, slide) => {
    const { currentSession } = get();
    if (currentSession?.presentation?.slides) {
      const updatedSlides = [...currentSession.presentation.slides];
      updatedSlides[slideIndex] = slide;
      
      set({
        currentSession: {
          ...currentSession,
          presentation: {
            ...currentSession.presentation,
            slides: updatedSlides,
          },
        },
      });
    }
  },
  
  resetSession: () => set({
    currentSession: null,
    processingStatus: 'idle',
    error: null,
    isRecording: false,
    recordingDuration: 0,
  }),
}));