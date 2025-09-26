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
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${
            dragActive
              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.02] shadow-lg'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/30 hover:shadow-md'
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
          />
          
          <div className="flex flex-col items-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
              dragActive 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl scale-110' 
                : 'bg-gradient-to-br from-gray-100 to-gray-200 hover:from-blue-100 hover:to-indigo-100'
            }`}>
              <Upload className={`w-10 h-10 transition-colors ${
                dragActive ? 'text-white' : 'text-gray-500 hover:text-blue-600'
              }`} />
            </div>
            
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
              Drop your audio file here
            </h3>
            
            <p className="text-lg text-gray-600 mb-6">
              or click to browse your files
            </p>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium">Supported formats: <span className="text-blue-600">MP3, WAV</span></p>
                <p className="font-medium">Maximum size: <span className="text-blue-600">{formatFileSize(maxSize)}</span></p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileAudio className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{selectedFile.name}</p>
                <p className="text-sm text-gray-600 font-medium">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-red-100 rounded-full transition-all duration-200 hover:scale-110 group"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
            </button>
          </div>
          
          <button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            Generate Presentation
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-md">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;