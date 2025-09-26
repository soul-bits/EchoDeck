import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";

export type ProcessingStep = 
  | "transcription" 
  | "outline-generation" 
  | "image-generation" 
  | "slide-assembly" 
  | "export-ready";

export type StepStatus = "pending" | "processing" | "completed" | "error";

interface ProcessingStepData {
  id: ProcessingStep;
  name: string;
  description: string;
  status: StepStatus;
  progress?: number;
  estimatedTime?: string;
}

interface ProcessingStatusProps {
  currentStep?: ProcessingStep;
  steps?: ProcessingStepData[];
  status?: "processing" | "completed" | "error";
}

export default function ProcessingStatus({ currentStep = "transcription", steps, status }: ProcessingStatusProps) {
  // Helper function to determine step status based on backend data
  const getStepStatus = (stepId: ProcessingStep, currentStep: ProcessingStep, status?: string): StepStatus => {
    const stepOrder: ProcessingStep[] = ["transcription", "outline-generation", "image-generation", "slide-assembly", "export-ready"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);
    
    // If we're completed and at export-ready, mark all steps as completed
    if (status === "completed" && currentStep === "export-ready") {
      return "completed";
    }
    
    // If this is the current step and we're processing
    if (stepId === currentStep && status === "processing") {
      return "processing";
    }
    
    // If this step comes before the current step, it's completed
    if (stepIndex < currentIndex) {
      return "completed";
    }
    
    // If this step comes after the current step, it's pending
    if (stepIndex > currentIndex) {
      return "pending";
    }
    
    // For the current step, check status
    if (stepId === currentStep) {
      if (status === "completed") return "completed";
      if (status === "error") return "error";
      return "processing";
    }
    
    return "pending";
  };

  // Create steps based on real backend data when available
  const createStepsFromBackend = (currentStep: ProcessingStep, status?: string): ProcessingStepData[] => [
    {
      id: "transcription",
      name: "Audio Transcription",
      description: "Converting speech to text using Whisper AI",
      status: getStepStatus("transcription", currentStep, status),
      progress: currentStep === "transcription" && status === "processing" ? 75 : undefined,
      estimatedTime: "30 seconds"
    },
    {
      id: "outline-generation",
      name: "Slide Outline",
      description: "Generating presentation structure with GPT-4o",
      status: getStepStatus("outline-generation", currentStep, status),
      progress: currentStep === "outline-generation" && status === "processing" ? 45 : undefined,
      estimatedTime: "60 seconds"
    },
    {
      id: "image-generation",
      name: "Visual Creation",
      description: "Creating slide images with DALL-E 3",
      status: getStepStatus("image-generation", currentStep, status),
      progress: currentStep === "image-generation" && status === "processing" ? 20 : undefined,
      estimatedTime: "90 seconds"
    },
    {
      id: "slide-assembly",
      name: "Slide Assembly",
      description: "Combining content and visuals into presentation",
      status: getStepStatus("slide-assembly", currentStep, status),
      progress: currentStep === "slide-assembly" && status === "processing" ? 85 : undefined,
      estimatedTime: "45 seconds"
    },
    {
      id: "export-ready",
      name: "Export Ready",
      description: "Finalizing formats and preparing downloads",
      status: getStepStatus("export-ready", currentStep, status),
      estimatedTime: "15 seconds"
    }
  ];

  // Use provided steps, or create from backend data, or fall back to defaults
  const processingSteps = steps || createStepsFromBackend(currentStep, status);
  
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case "processing":
        return <Badge className="animate-pulse">Processing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const completedSteps = processingSteps.filter(step => step.status === "completed").length;
  const totalProgress = (completedSteps / processingSteps.length) * 100;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Generating Your Presentation</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedSteps}/{processingSteps.length} Complete
          </span>
        </CardTitle>
        <Progress value={totalProgress} className="h-2" data-testid="progress-overall" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {processingSteps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex items-start space-x-4 p-4 rounded-lg transition-colors ${
              step.status === "processing" ? "bg-primary/5" : ""
            }`}
            data-testid={`step-${step.id}`}
          >
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(step.status)}
            </div>
            
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium" data-testid={`text-step-name-${step.id}`}>
                  {step.name}
                </h4>
                {getStatusBadge(step.status)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-step-description-${step.id}`}>
                {step.description}
              </p>
              
              {step.progress !== undefined && step.status === "processing" && (
                <div className="space-y-1">
                  <Progress value={step.progress} className="h-1" data-testid={`progress-step-${step.id}`} />
                  <div className="text-xs text-muted-foreground">
                    {step.progress}% complete • Est. {step.estimatedTime}
                  </div>
                </div>
              )}
              
              {step.status === "pending" && step.estimatedTime && (
                <div className="text-xs text-muted-foreground">
                  Est. {step.estimatedTime}
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Using OpenAI's most advanced models for the best results
          </p>
        </div>
      </CardContent>
    </Card>
  );
}