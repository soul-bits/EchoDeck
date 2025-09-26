import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileAudio, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { apiService } from '../services/api';
import { Presentation, Slide } from '../types';
import ProcessingStatus from '../components/ProcessingStatus';
import SlidePreview from '../components/SlidePreview';

const Generation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentSession,
    processingStatus,
    setProcessingStatus,
    setError,
    updatePresentation,
  } = useAppStore();
  
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    console.log('Generation useEffect triggered:', { 
      hasCurrentSession: !!currentSession, 
      sessionId: currentSession?.session_id, 
      id, 
      hasStarted, 
      isProcessing 
    });
    
    if (!currentSession || currentSession.session_id !== id) {
      navigate('/');
      return;
    }

    // Only start processing once
    if (!hasStarted && !isProcessing) {
      console.log('Starting processing from useEffect');
      setHasStarted(true);
      startProcessing();
    }
  }, [currentSession, id, navigate, hasStarted, isProcessing]);

  // Reset state when session changes
  useEffect(() => {
    setHasStarted(false);
    setIsProcessing(false);
    setUploadId(null);
    setPresentationId(null);
    setSlides([]);
  }, [id]);

  const startProcessing = async () => {
    if (!currentSession?.audio_file || isProcessing) {
      console.log('Skipping startProcessing:', { hasAudioFile: !!currentSession?.audio_file, isProcessing });
      return;
    }

    console.log('Starting processing...');
    setIsProcessing(true);
    try {
      // Step 1: Upload audio file
      setProcessingStatus('uploading');
      const uploadResponse = await apiService.uploadAudio({
        audio_file: currentSession.audio_file,
        style: currentSession.style || 'creative',
      });
      
      setUploadId(uploadResponse.upload_id);

      // Step 2: Wait for transcription
      setProcessingStatus('transcribing');
      await pollTranscription(uploadResponse.upload_id);

      // Step 3: Generate presentation
      setProcessingStatus('generating');
      const presentationResponse = await apiService.generatePresentation({
        upload_id: uploadResponse.upload_id,
        style: currentSession.style || 'creative',
        slide_count: 8,
      });
      
      setPresentationId(presentationResponse.presentation_id);
      
      // Step 4: Wait for presentation generation
      await pollPresentationGeneration(presentationResponse.presentation_id);
      
    } catch (error) {
      console.error('Processing failed:', error);
      setError(error instanceof Error ? error.message : 'Processing failed');
      setProcessingStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollTranscription = async (uploadId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // In a real implementation, you'd have an endpoint to check transcription status
          // For now, we'll simulate the process
          setTimeout(() => {
            resolve();
          }, 3000); // Simulate 3 seconds for transcription
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  };

  const pollPresentationGeneration = async (presentationId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let pollCount = 0;
      const maxPolls = 10; // Maximum number of polls to prevent infinite loops
      let timeoutId: NodeJS.Timeout | null = null;
      
      const checkStatus = async () => {
        try {
          pollCount++;
          const response = await apiService.getPresentationStatus(presentationId);
          
          if (response.status === 'completed' && response.storyboard) {
            setSlides(response.storyboard);
            setProcessingStatus('completed');
            
            // Update the presentation in the store
            const presentation: Presentation = {
              id: presentationId,
              title: 'Generated Presentation',
              style: currentSession?.style || 'creative',
              created_at: new Date().toISOString(),
              status: 'completed',
              slides: response.storyboard,
            };
            
            updatePresentation(presentation);
            resolve();
          } else if (response.status === 'failed') {
            reject(new Error('Presentation generation failed'));
          } else if (pollCount >= maxPolls) {
            reject(new Error('Presentation generation timeout'));
          } else {
            // Still processing, check again in 2 seconds
            timeoutId = setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      // Start checking after a short delay
      timeoutId = setTimeout(checkStatus, 1000);
      
      // Cleanup function to cancel timeout if component unmounts
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    });
  };

  const handleContinueToExport = () => {
    if (presentationId) {
      navigate(`/export/${presentationId}`);
    }
  };

  const getProcessingSteps = () => {
    const steps = [
      { id: 'uploading', label: 'Uploading audio file', icon: FileAudio },
      { id: 'transcribing', label: 'Transcribing audio to text', icon: Clock },
      { id: 'generating', label: 'Generating presentation slides', icon: Clock },
      { id: 'completed', label: 'Presentation ready!', icon: CheckCircle },
    ];

    return steps.map(step => ({
      ...step,
      status: getStepStatus(step.id),
    }));
  };

  const getStepStatus = (stepId: string): 'pending' | 'active' | 'completed' | 'error' => {
    const stepOrder = ['uploading', 'transcribing', 'generating', 'completed'];
    const currentIndex = stepOrder.indexOf(processingStatus);
    const stepIndex = stepOrder.indexOf(stepId);

    if (processingStatus === 'error') return 'error';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23e0e7ff%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <FileAudio className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">EchoDeck</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {processingStatus !== 'completed' ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <FileAudio className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4 sm:mb-6 px-4">
                Creating Your Presentation
              </h2>
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto px-4">
                Please wait while we process your audio and generate slides. This usually takes just a few minutes.
              </p>
            </div>

            <ProcessingStatus
              status={processingStatus}
              steps={getProcessingSteps()}
            />
          </div>
        ) : (
          <div>
            <div className="text-center mb-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-green-400/30 to-emerald-500/30 rounded-full mx-auto animate-ping" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 bg-clip-text text-transparent mb-4 px-4">
                Presentation Generated Successfully!
              </h2>
              <p className="text-lg sm:text-xl text-gray-700 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
                Your presentation is ready! Review the slides below and continue to export when you're satisfied.
              </p>
              
              <button
                onClick={handleContinueToExport}
                className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold inline-flex items-center space-x-2 sm:space-x-3 shadow-xl hover:shadow-2xl transform hover:scale-105 text-sm sm:text-base lg:text-lg"
              >
                <span>Continue to Export</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>

            {/* Slide Previews */}
            {slides.length > 0 && (
              <div className="mt-16">
                <div className="text-center mb-6 sm:mb-8 lg:mb-10">
                  <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 bg-clip-text text-transparent mb-3 px-4">
                    Slide Preview
                  </h3>
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-700">{slides.length} slides generated</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 px-4">
                  {slides.map((slide, index) => (
                    <div key={index} className="group">
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            Slide {index + 1}
                          </span>
                          <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
                        </div>
                        <SlidePreview
                          slide={slide}
                          slideNumber={index + 1}
                          isEditable={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Generation;