import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Video,
  Mic,
  Image,
  Cog,
  Check,
  X,
  Clock,
  Download,
  AlertCircle
} from "lucide-react";
import { getExportStatus, downloadExport, type ExportStatus } from "@/lib/api";

interface VideoExportProgressProps {
  exportId: string;
  onComplete: (exportId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

interface PhaseInfo {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const phases: PhaseInfo[] = [
  {
    key: 'initializing',
    label: 'Initializing',
    description: 'Preparing export job',
    icon: Clock,
    color: 'text-muted-foreground'
  },
  {
    key: 'tts',
    label: 'Generating Audio',
    description: 'Creating narration with AI voice',
    icon: Mic,
    color: 'text-blue-600'
  },
  {
    key: 'rendering',
    label: 'Rendering Slides',
    description: 'Converting slides to images',
    icon: Image,
    color: 'text-purple-600'
  },
  {
    key: 'assembly',
    label: 'Assembling Video',
    description: 'Combining audio and visuals',
    icon: Video,
    color: 'text-green-600'
  },
  {
    key: 'complete',
    label: 'Complete',
    description: 'Video ready for download',
    icon: Check,
    color: 'text-green-600'
  }
];

export default function VideoExportProgress({
  exportId,
  onComplete,
  onError,
  onCancel
}: VideoExportProgressProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Poll export status every 2 seconds
  const { data: exportStatus, error: statusError } = useQuery({
    queryKey: ['export-status', exportId],
    queryFn: () => getExportStatus(exportId),
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network issues
      if (failureCount < 3) {
        console.warn('Export status check failed, retrying...', error);
        return true;
      }
      return false;
    },
  });

  // Handle status changes
  useEffect(() => {
    if (exportStatus) {
      if (exportStatus.phase === 'error' && exportStatus.error) {
        onError(exportStatus.error);
      } else if (exportStatus.isReady && exportStatus.phase === 'complete') {
        onComplete(exportId);
      }
    }
  }, [exportStatus, exportId, onComplete, onError]);

  // Stop polling when complete or error
  useEffect(() => {
    if (exportStatus?.isReady || exportStatus?.phase === 'error') {
      // Query will automatically stop refetching based on enabled condition
    }
  }, [exportStatus]);

  // Handle query errors
  useEffect(() => {
    if (statusError) {
      const errorMessage = statusError instanceof Error 
        ? statusError.message 
        : 'Failed to check export status';
      onError(errorMessage);
    }
  }, [statusError, onError]);

  const handleDownload = async () => {
    if (!exportStatus?.isReady) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      await downloadExport(exportId);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to download video';
      setDownloadError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const getCurrentPhaseIndex = () => {
    if (!exportStatus?.phase) return 0;
    return phases.findIndex(phase => phase.key === exportStatus.phase);
  };

  const isPhaseComplete = (phaseIndex: number) => {
    const currentIndex = getCurrentPhaseIndex();
    return currentIndex > phaseIndex || exportStatus?.isReady;
  };

  const isPhaseActive = (phaseIndex: number) => {
    const currentIndex = getCurrentPhaseIndex();
    return currentIndex === phaseIndex && !exportStatus?.isReady;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = () => {
    if (!exportStatus?.createdAt) return '';
    const startTime = new Date(exportStatus.createdAt).getTime();
    const now = Date.now();
    const durationSeconds = Math.floor((now - startTime) / 1000);
    
    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    } else {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      return `${minutes}m ${seconds}s`;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Video Export Progress
          </CardTitle>
          {onCancel && !exportStatus?.isReady && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              data-testid="button-cancel-export"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span>{exportStatus?.progress || 0}%</span>
          </div>
          <Progress 
            value={exportStatus?.progress || 0} 
            className="w-full"
            data-testid="progress-overall"
          />
        </div>

        {/* Phase Steps */}
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const isComplete = isPhaseComplete(index);
            const isActive = isPhaseActive(index);
            
            return (
              <div 
                key={phase.key}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-primary/5 border border-primary/20' : 
                  isComplete ? 'bg-muted/30' : 'opacity-60'
                }`}
                data-testid={`phase-${phase.key}`}
              >
                <div className={`p-2 rounded-full ${
                  isComplete ? 'bg-green-100 text-green-600' :
                  isActive ? `bg-primary/10 ${phase.color}` :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${isActive ? 'text-foreground' : ''}`}>
                      {phase.label}
                    </h4>
                    {isComplete && <Badge variant="outline" className="text-xs">Done</Badge>}
                    {isActive && <Badge className="text-xs">Active</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export Info */}
        {exportStatus && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Export Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Format:</span>
                <span className="ml-2 font-medium uppercase">{exportStatus.format}</span>
              </div>
              {exportStatus.fileSize && (
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <span className="ml-2 font-medium">{formatFileSize(exportStatus.fileSize)}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium">{formatDuration()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={exportStatus.isReady ? "default" : "secondary"}
                  className="ml-2"
                >
                  {exportStatus.isReady ? "Ready" : "Processing"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {exportStatus?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Export failed: {exportStatus.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Download Error */}
        {downloadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {downloadError}
            </AlertDescription>
          </Alert>
        )}

        {/* Download Button */}
        {exportStatus?.isReady && !exportStatus?.error && (
          <div className="flex justify-center">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              size="lg"
              className="w-full max-w-md"
              data-testid="button-download-video"
            >
              {isDownloading ? (
                <>
                  <Cog className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Video{exportStatus.fileSize && ` (${formatFileSize(exportStatus.fileSize)})`}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Progress Message */}
        {exportStatus && !exportStatus.isReady && !exportStatus.error && (
          <div className="text-center text-sm text-muted-foreground">
            <p>
              {exportStatus.phase === 'tts' && 'Generating high-quality narration...'}
              {exportStatus.phase === 'rendering' && 'Converting slides to video frames...'}
              {exportStatus.phase === 'assembly' && 'Creating final video with transitions...'}
              {exportStatus.phase === 'initializing' && 'Setting up export job...'}
            </p>
            <p className="mt-1">
              This process may take several minutes depending on presentation length.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}