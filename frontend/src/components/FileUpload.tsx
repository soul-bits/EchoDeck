import React, { useRef, useState } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';
import { FileUploadProps } from '../types';
import { formatFileSize } from '../utils';
import { useAppStore } from '../stores/useAppStore';

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedFormats,
  maxSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { error, setError } = useAppStore();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setError(null);
    
    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError('Please upload an MP3 or WAV file');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${formatFileSize(maxSize)}`);
      return;
    }

    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 lg:p-12 text-center transition-all duration-300 group ${
            dragActive
              ? 'border-purple-400 bg-gradient-to-br from-purple-50/80 to-cyan-50/80 scale-[1.02] shadow-2xl backdrop-blur-sm'
              : 'border-white/30 hover:border-purple-300/50 hover:bg-gradient-to-br hover:from-white/20 hover:to-purple-50/20 hover:shadow-xl backdrop-blur-sm'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Upload audio file"
          />
          
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 ${
              dragActive 
                ? 'bg-gradient-to-br from-purple-500 to-cyan-500 shadow-2xl scale-110' 
                : 'bg-gradient-to-br from-white/20 to-purple-100/30 group-hover:from-purple-200/40 group-hover:to-cyan-200/40'
            }`}>
              <Upload className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${
                dragActive ? 'text-white' : 'text-purple-400 group-hover:text-purple-500'
              }`} />
            </div>
            
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-3">
              Drop your audio file here
            </h3>
            
            <p className="text-base sm:text-lg text-purple-100/80 mb-6 leading-relaxed">
              or click to browse your files
            </p>
            
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/30 shadow-lg">
              <div className="text-sm sm:text-base text-purple-100/90 space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
                  <p className="font-medium">Supported formats: <span className="text-cyan-300 font-semibold">MP3, WAV, M4A</span></p>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
                  <p className="font-medium">Maximum size: <span className="text-cyan-300 font-semibold">{formatFileSize(maxSize)}</span></p>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
                  <p className="font-medium">Duration: <span className="text-cyan-300 font-semibold">Up to 5 minutes</span></p>
                </div>
              </div>
            </div>
            
            {/* Visual indicator for drag state */}
            {dragActive && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 animate-pulse"></div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
                <FileAudio className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base sm:text-lg truncate">{selectedFile.name}</p>
                <p className="text-sm text-purple-200/80 font-medium">{formatFileSize(selectedFile.size)}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full"></div>
                  <span className="text-xs text-emerald-300 font-medium">Ready to process</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-200 hover:scale-110 group"
              aria-label="Remove file"
            >
              <X className="w-5 h-5 text-purple-300 group-hover:text-red-400" />
            </button>
          </div>
          
          <button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white py-4 px-6 rounded-2xl transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] group flex items-center justify-center space-x-3"
          >
            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Generate Presentation</span>
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-md border border-red-400/30 rounded-2xl shadow-xl">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <X className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-red-200 font-semibold text-sm sm:text-base mb-1">Upload Error</p>
              <p className="text-red-100/90 text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;