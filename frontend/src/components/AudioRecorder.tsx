import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, RotateCcw } from 'lucide-react';
import { AudioRecorderProps } from '../types';
import { formatDuration } from '../utils';
import { useAppStore } from '../stores/useAppStore';

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  maxDuration = 300, // 5 minutes default
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { setError } = useAppStore();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Clean up blob URL on component unmount
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine the best audio format supported by the browser
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        // Clean up previous blob URL before creating new one
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        
        // Create new blob URL with a slight delay to ensure cleanup
        setTimeout(() => {
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }, 100);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
      
    } catch (error) {
      setError('Unable to access microphone. Please check your permissions.');
      console.error('Error accessing microphone:', error);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        // Resume timer
        timerRef.current = setInterval(() => {
          setDuration(prev => {
            const newDuration = prev + 1;
            if (newDuration >= maxDuration) {
              stopRecording();
            }
            return newDuration;
          });
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const resumeRecording = () => {
    pauseRecording();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
    
    // Clean up blob URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset audio chunks
    audioChunksRef.current = [];
  };

  const handleUseRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  const progressPercentage = (duration / maxDuration) * 100;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-10 transition-all duration-300 hover:shadow-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl mb-6 shadow-xl animate-pulse">
          <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-3">
          Record Your Audio
        </h3>
        <p className="text-purple-100/80 text-base sm:text-lg leading-relaxed px-4 mb-4">
          Click the microphone to start recording your presentation
        </p>
        
        {/* Recording guidelines */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 max-w-md mx-auto">
          <div className="text-sm text-purple-100/90 space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
              <span className="font-medium">Speak clearly and at a normal pace</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
              <span className="font-medium">Maximum duration: {formatDuration(maxDuration)}</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
              <span className="font-medium">You can pause and resume anytime</span>
            </div>
          </div>
        </div>
      </div>
      {!audioBlob ? (
        <div className="text-center">
          {/* Recording Controls */}
          <div className="mb-8">
            <div className="relative inline-block">
              {isRecording && !isPaused && (
                <div className="absolute inset-0 rounded-full bg-red-400/50 animate-ping"></div>
              )}
              <button
                  onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : startRecording}
                  disabled={isProcessing}
                  aria-label={isRecording ? (isPaused ? 'Resume recording' : 'Pause recording') : 'Start recording'}
                  className={`
                    relative inline-flex items-center justify-center w-24 h-24 rounded-full text-white font-medium transition-all duration-300 mr-6 shadow-2xl backdrop-blur-md
                    ${isRecording && !isPaused
                      ? 'bg-gradient-to-br from-red-500/80 to-red-600/80 hover:from-red-600/90 hover:to-red-700/90 border border-red-400/30'
                      : isRecording && isPaused
                      ? 'bg-gradient-to-br from-yellow-500/80 to-orange-500/80 hover:from-yellow-600/90 hover:to-orange-600/90 border border-yellow-400/30'
                      : 'bg-gradient-to-br from-purple-500/80 to-cyan-500/80 hover:from-purple-600/90 hover:to-cyan-600/90 border border-purple-400/30'
                    }
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:shadow-3xl'}
                    focus:outline-none focus:ring-4 focus:ring-purple-400/50
                  `}
                >
                  {isRecording && !isPaused ? (
                    <Pause className="w-6 h-6 sm:w-10 sm:h-10" />
                  ) : isRecording && isPaused ? (
                    <Play className="w-6 h-6 sm:w-10 sm:h-10" />
                  ) : (
                    <Mic className="w-6 h-6 sm:w-10 sm:h-10" />
                  )}
                </button>
                
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    disabled={isProcessing}
                    aria-label="Stop recording"
                    className={`
                      relative inline-flex items-center justify-center w-20 h-20 rounded-full text-white font-medium transition-all duration-300 shadow-2xl backdrop-blur-md
                      bg-gradient-to-br from-gray-600/80 to-gray-700/80 hover:from-gray-700/90 hover:to-gray-800/90 border border-gray-500/30
                      ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:shadow-3xl'}
                      focus:outline-none focus:ring-4 focus:ring-gray-400/50
                    `}
                  >
                    <Square className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                )}
            </div>
            
            {/* Timer and Progress */}
            <div className="text-2xl sm:text-4xl font-mono font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
              {formatDuration(duration)}
            </div>
            <div className="text-sm text-purple-200/70 mb-6">
              Maximum: {formatDuration(maxDuration)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full max-w-lg mx-auto mb-8">
              <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-3 border border-white/30">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="group bg-gradient-to-r from-purple-500/80 to-cyan-500/80 hover:from-purple-600/90 hover:to-cyan-600/90 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-semibold flex items-center space-x-3 shadow-xl hover:scale-105 hover:shadow-2xl backdrop-blur-md border border-purple-400/30"
              >
                <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-lg">Start Recording</span>
              </button>
            ) : (
              <>
                <button
                  onClick={pauseRecording}
                  className="group bg-gradient-to-r from-yellow-500/80 to-orange-500/80 hover:from-yellow-600/90 hover:to-orange-600/90 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-semibold flex items-center space-x-3 shadow-xl hover:scale-105 hover:shadow-2xl backdrop-blur-md border border-yellow-400/30"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-lg">Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-lg">Pause</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={stopRecording}
                  className="group bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-600/90 hover:to-red-700/90 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-semibold flex items-center space-x-3 shadow-xl hover:scale-105 hover:shadow-2xl backdrop-blur-md border border-red-400/30"
                >
                  <Square className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Stop</span>
                </button>
              </>
            )}
          </div>
          
          {isRecording && (
            <div className="mt-8">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full animate-pulse shadow-lg" />
                <span className="text-lg font-semibold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
                  {isPaused ? 'Recording Paused' : 'Recording...'}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl mb-8 shadow-2xl animate-bounce">
              <Mic className="w-12 h-12 text-white" />
            </div>
            <h4 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-4">
              Recording Complete!
            </h4>
            <p className="text-purple-100/90 text-xl mb-8">
              Duration: <span className="font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">{formatDuration(duration)}</span>
            </p>
          </div>
          
          {/* Audio Playback */}
          {audioUrl && audioBlob && (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-10 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-3 sm:space-x-6">
                  <button
                    onClick={() => audioRef.current?.paused ? audioRef.current?.play() : audioRef.current?.pause()}
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/80 to-cyan-500/80 rounded-2xl text-white shadow-2xl hover:scale-110 transition-all duration-300 backdrop-blur-md border border-purple-400/30"
                  >
                    <Play className="w-8 h-8" />
                  </button>
                  <div className="text-lg text-purple-100/90 font-mono font-semibold">
                    {formatDuration(duration)}
                  </div>
                </div>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                preload="metadata"
                className="w-full h-14 rounded-2xl backdrop-blur-md"
                style={{ filter: 'brightness(1.1) contrast(1.1)' }}
                onError={(e) => {
                  console.error('Audio playback error:', e);
                  // Don't show error for blob URL issues, just log them
                  if (!e.currentTarget.src.startsWith('blob:')) {
                    setError('Error playing audio recording');
                  }
                }}
              />
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
               onClick={handleUseRecording}
               className="group flex items-center justify-center px-6 sm:px-10 py-3 sm:py-5 rounded-2xl font-bold transition-all duration-300 shadow-2xl bg-gradient-to-r from-emerald-500/80 to-green-500/80 hover:from-emerald-600/90 hover:to-green-600/90 text-white hover:scale-105 hover:shadow-3xl backdrop-blur-md border border-emerald-400/30"
             >
               <Upload className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 group-hover:scale-110 transition-transform" />
               <span className="text-base sm:text-xl">Upload & Generate</span>
             </button>
             
             <button
               onClick={resetRecording}
               className="group flex items-center justify-center px-6 sm:px-10 py-3 sm:py-5 rounded-2xl font-bold border-2 border-white/30 text-white hover:border-white/50 hover:bg-white/10 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-3xl backdrop-blur-md"
             >
               <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 group-hover:rotate-180 transition-transform duration-500" />
               <span className="text-base sm:text-xl">Record Again</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;