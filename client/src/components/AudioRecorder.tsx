import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Upload, Play, Pause, RotateCcw, Check } from "lucide-react";

interface AudioRecorderProps {
  onAudioReady?: (audioFile: File, skipImages?: boolean) => void;
}

export default function AudioRecorder({ onAudioReady }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipImages, setSkipImages] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxDuration = 300; // 5 minutes in seconds
  const progress = (recordingTime / maxDuration) * 100;

  const startRecording = async () => {
    console.log("Starting recording...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use MP4 audio format which is more compatible with OpenAI
      let options: MediaRecorderOptions = { mimeType: 'audio/mp4' };
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = { mimeType: 'audio/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = {}; // fallback to default
      }
      
      console.log("Using MediaRecorder with options:", options);
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        // Use the browser's native format instead of forcing WAV
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setHasRecording(true);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };

  const pauseRecording = () => {
    console.log("Pausing recording...");
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsPaused(false);
  };

  const resetRecording = () => {
    console.log("Resetting recording...");
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setHasRecording(false);
    setRecordingTime(0);
    setAudioUrl("");
    setIsPlaying(false);
    audioChunksRef.current = [];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File uploaded:", file.name);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setHasRecording(true);
      setRecordingTime(0);
      onAudioReady?.(file, skipImages);
    }
  };

  const togglePlayback = () => {
    console.log("Toggling playback");
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProceed = async () => {
    console.log("Proceeding with audio processing...");
    if (onAudioReady && audioUrl) {
      try {
        // Convert audio URL back to blob
        const response = await fetch(audioUrl);
        const audioBlob = await response.blob();
        
        // Get the actual MIME type from MediaRecorder
        const actualType = mediaRecorderRef.current?.mimeType || audioBlob.type;
        
        // Determine file extension based on actual MIME type
        let fileName = "recording.webm";
        let fileType = actualType;
        
        if (actualType.includes("webm")) {
          fileName = "recording.webm";
          fileType = "audio/webm";
        } else if (actualType.includes("mp4")) {
          fileName = "recording.mp4";
          fileType = "audio/mp4";
        } else if (actualType.includes("ogg")) {
          fileName = "recording.ogg";
          fileType = "audio/ogg";
        }
        
        // Create a File object with proper extension for OpenAI
        const audioFile = new File([audioBlob], fileName, { type: fileType });
        
        console.log("Audio ready for processing", { 
          type: audioFile.type, 
          size: audioFile.size,
          name: audioFile.name,
          originalMimeType: actualType
        });
        onAudioReady(audioFile, skipImages);
      } catch (error) {
        console.error("Failed to process audio:", error);
        alert("Failed to process audio. Please try again.");
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Audio Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording Status */}
        <div className="text-center space-y-2">
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              {isPaused ? "PAUSED" : "RECORDING"}
            </Badge>
          )}
          
          <div className="text-2xl font-mono font-bold" data-testid="text-recording-time">
            {formatTime(recordingTime)}
          </div>
          
          {recordingTime > 0 && (
            <Progress value={progress} className="h-2" data-testid="progress-recording" />
          )}
          
          <div className="text-sm text-muted-foreground">
            Max duration: 5 minutes
          </div>
        </div>

        {/* Recording Controls */}
        {!hasRecording && (
          <div className="flex gap-2 justify-center">
            {!isRecording ? (
              <Button 
                onClick={startRecording}
                size="lg"
                className="flex-1"
                data-testid="button-start-recording"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={pauseRecording}
                  variant="outline"
                  size="lg"
                  data-testid="button-pause-recording"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  data-testid="button-stop-recording"
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upload Option */}
        {!isRecording && !hasRecording && (
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Or</div>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.ogg"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-audio"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Audio File
            </Button>
            <div className="text-xs text-muted-foreground mt-1">
              Supports MP3, WAV, M4A, OGG
            </div>
          </div>
        )}

        {/* Skip Images Option - Always visible */}
        {!isRecording && (
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="skip-images-audio"
              data-testid="checkbox-skip-images-audio"
              checked={skipImages}
              onCheckedChange={(checked) => setSkipImages(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="skip-images-audio" className="text-sm font-medium cursor-pointer">
                Skip image generation (faster)
              </Label>
              <p className="text-xs text-muted-foreground">
                Generate text-only slides without AI images for quicker results
              </p>
            </div>
          </div>
        )}

        {/* Playback Controls */}
        {hasRecording && (
          <div className="space-y-4">
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={togglePlayback}
                variant="outline"
                data-testid="button-play-audio"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button 
                onClick={resetRecording}
                variant="outline"
                data-testid="button-reset-recording"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
            
            <Button 
              onClick={handleProceed}
              size="lg"
              className="w-full"
              data-testid="button-proceed-processing"
            >
              <Check className="w-4 h-4 mr-2" />
              Generate Presentation
            </Button>
          </div>
        )}

        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} className="hidden" />
        )}
      </CardContent>
    </Card>
  );
}