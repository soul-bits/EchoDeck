import React from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { ProcessingStatusProps } from '../types';

interface ProcessingStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface ProcessingStatusComponentProps extends ProcessingStatusProps {
  steps: ProcessingStep[];
}

const ProcessingStatus: React.FC<ProcessingStatusComponentProps> = ({
  status,
  steps,
  currentStep,
  estimatedTime,
}) => {
  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'active':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-300" />;
    }
  };

  const getStatusColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-200';
    }
  };

  const getTextColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'text-green-700';
      case 'active':
        return 'text-blue-700';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-indigo-50/50" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        {/* Overall Status */}
        <div className="text-center mb-10">
          {status === 'error' ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">Processing Failed</span>
            </div>
          ) : status === 'completed' ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">Processing Complete</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">Processing...</span>
            </div>
          )}
        
          {currentStep && (
            <p className="text-gray-700 mt-3 text-lg">{currentStep}</p>
          )}
          
          {estimatedTime && status !== 'completed' && status !== 'error' && (
            <p className="text-sm text-gray-600 mt-2 bg-white/50 rounded-full px-4 py-2 inline-block">
              Estimated time remaining: {Math.ceil(estimatedTime / 60)} minutes
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative group">
                <div className="flex items-center">
                  {/* Step Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${getStatusColor(step.status)} ${step.status === 'active' ? 'scale-110 shadow-lg' : 'shadow-md'} ${step.status === 'completed' ? 'shadow-green-200' : ''}`}>
                    {getStatusIcon(step.status)}
                  </div>
                  
                  {/* Step Content */}
                  <div className="ml-6 flex-1">
                    <p className={`font-semibold text-lg transition-colors duration-300 ${getTextColor(step.status)}`}>
                      {step.label}
                    </p>
                    
                    {step.status === 'active' && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full animate-pulse transition-all duration-1000" style={{ width: '60%' }} />
                        </div>
                        <p className="text-sm text-blue-600 mt-2 font-medium">Processing...</p>
                      </div>
                    )}
                    
                    {step.status === 'completed' && (
                      <p className="text-sm text-green-600 mt-1 font-medium">✓ Completed</p>
                    )}
                  </div>
                </div>
                
                {/* Connector Line */}
                {!isLast && (
                  <div className={`absolute left-6 top-12 w-0.5 h-8 transition-colors duration-300 ${
                    step.status === 'completed' ? 'bg-gradient-to-b from-green-400 to-green-300' : 'bg-gray-300/50'
                  }`} />
                )}
              </div>
            );
          })}
      </div>

        {/* Additional Info */}
        {status === 'error' && (
          <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm leading-relaxed">
                Something went wrong during processing. Please try again or contact support if the issue persists.
              </p>
            </div>
          </div>
        )}
        
        {(status === 'transcribing' || status === 'generating') && (
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-white text-xs font-bold">💡</span>
              </div>
              <p className="text-blue-700 text-sm leading-relaxed">
                <strong className="font-semibold">Tip:</strong> This process may take a few minutes depending on the length of your audio file.
                Feel free to grab a coffee while we work on your presentation!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingStatus;