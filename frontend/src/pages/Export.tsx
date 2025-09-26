import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, ArrowLeft, Eye } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { apiService } from '../services/api';
import { ExportFormat, QualitySetting } from '../types';

const Export: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSession } = useAppStore();
  
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [selectedQuality, setSelectedQuality] = useState<QualitySetting>('standard');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const presentation = currentSession?.presentation;
  const slides = presentation?.slides || [];

  useEffect(() => {
    if (!presentation || presentation.id !== id) {
      navigate('/');
      return;
    }
  }, [presentation, id, navigate]);


  const handleExport = async () => {
    if (!presentation) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await apiService.exportPresentation(presentation.id, {
        format: selectedFormat,
        quality: selectedQuality,
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the file
      const link = document.createElement('a');
      link.href = response.export_url;
      link.download = `presentation.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!presentation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Presentation Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23e0e7ff%22 fill-opacity=%220.3%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/generate/${currentSession?.session_id}`)}
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/10 hover:scale-105"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">Export Presentation</h1>
              </div>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-3 bg-gradient-to-r from-purple-500/80 to-indigo-500/80 text-white px-6 py-3 rounded-xl hover:from-purple-600/90 hover:to-indigo-600/90 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl backdrop-blur-md border border-purple-400/30 hover:scale-105"
            >
              <Eye className="w-5 h-5" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Presentation Preview */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 bg-clip-text text-transparent mb-6 sm:mb-8">Presentation Preview</h2>
            
            {/* Current Slide Display */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-8 mb-8">
              <div className="aspect-video bg-gradient-to-br from-gray-50/80 to-white/60 rounded-2xl mb-6 flex items-center justify-center border border-gray-200/50 backdrop-blur-sm">
                {slides[currentSlideIndex] ? (
                  <div className="w-full h-full p-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-6">
                      {slides[currentSlideIndex].title}
                    </h3>
                    <ul className="space-y-3">
                      {slides[currentSlideIndex].content?.map((point, index) => (
                        <li key={index} className="text-gray-700 flex items-start text-lg">
                          <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2 mr-4 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-500 text-lg">No slides available</p>
                )}
              </div>
              
              {/* Slide Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                  className="px-6 py-3 bg-gradient-to-r from-gray-100/80 to-gray-200/80 text-gray-700 rounded-xl hover:from-gray-200/90 hover:to-gray-300/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold backdrop-blur-sm border border-gray-300/30 hover:scale-105"
                >
                  Previous
                </button>
                
                <div className="bg-gradient-to-r from-blue-100/80 to-indigo-100/80 px-4 py-2 rounded-full backdrop-blur-sm border border-blue-200/50">
                  <span className="text-sm font-semibold text-gray-700">
                    {currentSlideIndex + 1} of {slides.length}
                  </span>
                </div>
                
                <button
                  onClick={nextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="px-6 py-3 bg-gradient-to-r from-gray-100/80 to-gray-200/80 text-gray-700 rounded-xl hover:from-gray-200/90 hover:to-gray-300/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold backdrop-blur-sm border border-gray-300/30 hover:scale-105"
                >
                  Next
                </button>
              </div>
            </div>
            
            {/* Slide Thumbnails */}
            <div className="grid grid-cols-4 gap-4">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`aspect-video bg-gradient-to-br from-gray-50/80 to-white/60 rounded-2xl p-3 border-2 transition-all duration-300 backdrop-blur-sm hover:scale-105 ${
                    index === currentSlideIndex
                      ? 'border-blue-500/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 shadow-lg'
                      : 'border-gray-200/50 hover:border-gray-300/70 hover:shadow-md'
                  }`}
                >
                  <div className="w-full h-full bg-white/60 rounded-xl p-2 backdrop-blur-sm">
                    <h4 className="text-xs font-bold text-gray-900 mb-2 truncate">
                      {slide.title}
                    </h4>
                    <div className="space-y-1">
                      {slide.content?.slice(0, 3).map((point, pointIndex) => (
                        <div key={pointIndex} className="text-xs text-gray-600 truncate flex items-start">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-1 flex-shrink-0" />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 bg-clip-text text-transparent mb-6 sm:mb-8">Export Options</h2>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-8 space-y-8">
              {/* Format Selection */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Export Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['pdf', 'pptx'].map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format as ExportFormat)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm hover:scale-105 ${
                        selectedFormat === format
                          ? 'border-blue-500/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 text-blue-700 shadow-lg'
                          : 'border-gray-200/50 hover:border-gray-300/70 text-gray-700 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <FileText className="w-6 h-6" />
                        <span className="font-bold text-lg">{format.toUpperCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Selection */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Quality
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {['low', 'medium', 'high'].map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setSelectedQuality(quality as QualitySetting)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm hover:scale-105 ${
                        selectedQuality === quality
                          ? 'border-blue-500/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 text-blue-700 shadow-lg'
                          : 'border-gray-200/50 hover:border-gray-300/70 text-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="font-bold text-lg capitalize">{quality}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-2xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-105 border border-blue-500/30"
              >
                {isExporting ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3">
                    <Download className="w-6 h-6" />
                    <span>Export Presentation</span>
                  </div>
                )}
              </button>

              {/* Export Progress */}
              {exportProgress > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between text-lg font-semibold text-gray-700">
                    <span>Export Progress</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">{exportProgress}%</span>
                  </div>
                  <div className="w-full bg-gradient-to-r from-gray-200/80 to-gray-300/80 rounded-full h-3 backdrop-blur-sm border border-gray-300/50">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Export;