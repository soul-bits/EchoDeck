import { create } from 'zustand';
import { SessionData, ProcessingStatus, Presentation, Slide } from '../types';
import { ToastData } from '../components/ToastContainer';

interface AppState {
  // Session data
  currentSession: SessionData | null;
  processingStatus: ProcessingStatus;
  error: string | null;
  
  // UI state
  isRecording: boolean;
  recordingDuration: number;
  toasts: ToastData[];
  
  // Actions
  setCurrentSession: (session: SessionData | null) => void;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setError: (error: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  updatePresentation: (presentation: Presentation) => void;
  updateSlide: (slideIndex: number, slide: Slide) => void;
  resetSession: () => void;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentSession: null,
  processingStatus: 'idle',
  error: null,
  isRecording: false,
  recordingDuration: 0,
  toasts: [],

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
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }));
  },
}));