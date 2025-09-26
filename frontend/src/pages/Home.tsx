import React, { useState } from 'react';
import { Upload, Mic, FileAudio, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { validateAudioFile, generateSessionId } from '../utils';
import { PresentationStyle } from '../types';
import AudioRecorder from '../components/AudioRecorder';
import FileUpload from '../components/FileUpload';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentSession, setProcessingStatus, setError } = useAppStore();
  const [selectedStyle, setSelectedStyle] = useState<PresentationStyle>('creative');
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'record'>('upload');

  const presentationStyles = [
    {
      id: 'creative' as PresentationStyle,
      name: 'Creative',
      description: 'Engaging, story-driven presentations with compelling visuals',
      color: 'bg-blue-500',
    },
    {
      id: 'professional' as PresentationStyle,
      name: 'Professional',
      description: 'Professional, data-focused presentations for business contexts',
      color: 'bg-gray-600',
    },
    {
      id: 'academic' as PresentationStyle,
      name: 'Academic',
      description: 'Detailed, scholarly presentations with research focus',
      color: 'bg-purple-500',
    },
    {
      id: 'casual' as PresentationStyle,
      name: 'Casual',
      description: 'Friendly, conversational presentations with accessible language',
      color: 'bg-green-500',
    },
  ];

  const handleFileSelect = (file: File) => {
    const validation = validateAudioFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    const sessionId = generateSessionId();
    setCurrentSession({
      session_id: sessionId,
      audio_file: file,
      style: selectedStyle,
    });

    setError(null);
    navigate(`/generate/${sessionId}`);
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    // Use the actual blob type instead of hardcoding audio/wav
    const blobType = audioBlob.type || 'audio/webm';
    const extension = blobType.includes('webm') ? 'webm' : 
                     blobType.includes('mp4') ? 'mp4' : 'wav';
    
    const audioFile = new File([audioBlob], `recording.${extension}`, {
      type: blobType,
    });

    const sessionId = generateSessionId();
    setCurrentSession({
      session_id: sessionId,
      audio_file: audioFile,
      style: selectedStyle,
    });

    navigate(`/generate/${sessionId}`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileAudio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">EchoDeck</h1>
                <p className="text-sm text-purple-200/80">AI-Powered Presentations</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-sm font-medium text-purple-200">✨ Powered by Advanced AI</span>
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 sm:mb-8 leading-tight px-2">
            <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
              Transform Your Voice
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              into Stunning Presentations
            </span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-purple-100/90 mb-8 sm:mb-10 lg:mb-12 max-w-4xl mx-auto leading-relaxed px-4">
            Upload an audio recording or speak directly into your microphone.
            Our advanced AI will create a beautiful, professional presentation in minutes.
          </p>
        </div>

        {/* Presentation Style Selection */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-6 sm:mb-8 lg:mb-10 px-4">
            Choose Your Presentation Style
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-4">
            {presentationStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`group relative p-6 rounded-2xl border transition-all duration-300 transform hover:scale-105 ${
                  selectedStyle === style.id
                    ? 'border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 backdrop-blur-md shadow-2xl'
                    : 'border-white/20 bg-white/10 backdrop-blur-md hover:border-purple-400/30 hover:bg-white/15'
                }`}
              >
                <div className={`w-16 h-16 ${style.color} rounded-2xl mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow`} />
                <h4 className="font-bold text-white mb-3 text-lg">{style.name}</h4>
                <p className="text-sm text-purple-100/80 leading-relaxed">{style.description}</p>
                {selectedStyle === style.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Method Selection */}
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-xl">
              <button
                onClick={() => setUploadMethod('upload')}
                className={`px-8 py-4 rounded-xl transition-all duration-300 font-medium flex items-center space-x-3 ${
                  uploadMethod === 'upload'
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload File</span>
              </button>
              <button
                onClick={() => setUploadMethod('record')}
                className={`px-8 py-4 rounded-xl transition-all duration-300 font-medium flex items-center space-x-3 ${
                  uploadMethod === 'record'
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span>Record Audio</span>
              </button>
            </div>
          </div>

          {/* Upload/Record Interface */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-white/20 mx-4">
            {uploadMethod === 'upload' ? (
              <FileUpload
                onFileSelect={handleFileSelect}
                acceptedFormats={['audio/mp3', 'audio/wav', 'audio/mpeg']}
                maxSize={50 * 1024 * 1024} // 50MB
              />
            ) : (
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                maxDuration={300} // 5 minutes
              />
            )}
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <FileAudio className="w-8 h-8 text-cyan-400" />
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">AI-Powered Transcription</h4>
              <p className="text-purple-100/80 leading-relaxed">Advanced speech recognition converts your audio to text with exceptional accuracy using cutting-edge AI models.</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <ArrowRight className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">Smart Slide Generation</h4>
              <p className="text-purple-100/80 leading-relaxed">Our intelligent AI analyzes your content and creates beautifully structured, engaging slides automatically.</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">Multiple Export Formats</h4>
              <p className="text-purple-100/80 leading-relaxed">Export your presentations in various formats including PDF, HTML, and video to suit any presentation need.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;