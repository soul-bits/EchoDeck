import {
  AudioUploadRequest,
  AudioUploadResponse,
  PresentationGenerationRequest,
  PresentationGenerationResponse,
  SlideUpdateRequest,
  SlideUpdateResponse,
  ExportRequest,
  ExportResponse,
  // ApiError
} from '../types';
import { apiUrl } from '../utils';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(apiUrl(endpoint), {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async uploadFile<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Audio upload and transcription
  async uploadAudio(request: AudioUploadRequest): Promise<AudioUploadResponse> {
    const formData = new FormData();
    formData.append('audio_file', request.audio_file);
    if (request.style) {
      formData.append('style', request.style);
    }

    return this.uploadFile<AudioUploadResponse>('/api/audio/upload', formData);
  }

  // Presentation generation
  async generatePresentation(
    request: PresentationGenerationRequest
  ): Promise<PresentationGenerationResponse> {
    return this.request<PresentationGenerationResponse>('/api/presentations/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Slide editing
  async updateSlide(
    presentationId: string,
    slideId: string,
    request: SlideUpdateRequest
  ): Promise<SlideUpdateResponse> {
    return this.request<SlideUpdateResponse>(
      `/api/presentations/${presentationId}/slides/${slideId}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
  }

  // Export generation
  async exportPresentation(
    presentationId: string,
    request: ExportRequest
  ): Promise<ExportResponse> {
    return this.request<ExportResponse>(
      `/api/presentations/${presentationId}/export`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // Get presentation status
  async getPresentationStatus(presentationId: string): Promise<PresentationGenerationResponse> {
    return this.request<PresentationGenerationResponse>(
      `/api/presentations/${presentationId}/status`
    );
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;