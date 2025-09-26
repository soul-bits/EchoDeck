import React, { useState } from 'react';
import { Edit3, Image, FileText } from 'lucide-react';
import { SlidePreviewProps } from '../types';

interface ExtendedSlidePreviewProps extends SlidePreviewProps {
  slideNumber?: number;
}

const SlidePreview: React.FC<ExtendedSlidePreviewProps> = ({
  slide,
  slideNumber,
  onEdit,
  isEditable = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleEdit = () => {
    if (onEdit && isEditable) {
      onEdit(slide);
    }
  };

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/90"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slide Header */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold text-white">
                {slideNumber || slide.order}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 truncate text-base">
              {slide.title || `Slide ${slide.order}`}
            </h3>
          </div>
          
          {isEditable && (
            <button
              onClick={handleEdit}
              className={`p-2 rounded-full transition-all duration-200 ${
                isHovered
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-110'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Slide Content */}
      <div className="p-5">
        {/* Title */}
        <h4 className="font-bold text-gray-900 mb-4 text-base leading-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {slide.title}
        </h4>

        {/* Content Points */}
        {slide.content && slide.content.length > 0 && (
          <div className="mb-4">
            <ul className="space-y-2">
              {slide.content.slice(0, 3).map((point, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <span className="line-clamp-2 leading-relaxed">{point}</span>
                </li>
              ))}
              {slide.content.length > 3 && (
                <li className="text-sm text-gray-500 italic font-medium">
                  +{slide.content.length - 3} more points
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Image Placeholder */}
        {slide.image_path || slide.dalle_prompt ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-3 text-green-700">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Image className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">
                {slide.image_path ? 'Image attached' : 'AI image will be generated'}
              </span>
            </div>
            {slide.dalle_prompt && (
              <p className="text-sm text-green-600 mt-3 line-clamp-2 bg-white/50 rounded-md p-2">
                <span className="font-medium">Prompt:</span> {slide.dalle_prompt}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-3 text-gray-500">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <Image className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm font-medium">No image</span>
            </div>
          </div>
        )}

        {/* Speaker Notes */}
        {slide.speaker_notes && (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm text-amber-800 line-clamp-2 leading-relaxed">
                {slide.speaker_notes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Slide Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">Slide {slideNumber || slide.order}</span>
          {isEditable && (
            <span className="text-blue-600 font-medium hover:text-blue-700 transition-colors">Click to edit</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlidePreview;