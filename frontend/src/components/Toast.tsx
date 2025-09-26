import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30';
      case 'error':
        return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-400/30';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30';
      case 'info':
      default:
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30';
    }
  };

  return (
    <div className={`${getBackgroundColor()} backdrop-blur-md rounded-2xl p-4 border shadow-xl max-w-sm w-full transform transition-all duration-300 hover:scale-105`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          {message && (
            <p className="text-sm text-purple-100/80 leading-relaxed">{message}</p>
          )}
        </div>
        
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-purple-300 hover:text-white" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
