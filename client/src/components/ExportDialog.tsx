import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Globe, 
  Video, 
  Download,
  Settings,
  Mic,
  Play,
  FileSpreadsheet
} from "lucide-react";
import type { VideoExportOptions } from "@/lib/api";

// Export format definitions
export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  size?: string;
  disabled?: boolean;
}

// Video export form schema
const videoExportSchema = z.object({
  format: z.enum(['mp4', 'avi', 'mov']),
  quality: z.enum(['high', 'medium', 'low']),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']),
  ttsModel: z.enum(['tts-1', 'tts-1-hd']).optional(),
});

type VideoExportForm = z.infer<typeof videoExportSchema>;

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentationId: string;
  onExport: (format: string, options?: VideoExportOptions) => void;
  onClose: () => void;
}

export default function ExportDialog({
  open,
  onOpenChange,
  presentationId,
  onExport,
  onClose
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Get server configuration for available features
  const { data: config } = useQuery({
    queryKey: ['/api/config'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const form = useForm<VideoExportForm>({
    resolver: zodResolver(videoExportSchema),
    defaultValues: {
      format: 'mp4',
      quality: 'medium',
      voice: 'alloy',
      ttsModel: 'tts-1',
    },
  });

  const isGoogleSlidesConfigured = (config as any)?.googleSlidesEnabled || false;
  const isTTSConfigured = (config as any)?.ttsEnabled || false;

  // Define export formats
  const exportFormats: ExportFormat[] = [
    {
      id: "pdf",
      name: "PDF Document",
      description: "Professional document format for printing and sharing",
      icon: FileText,
      size: "~2.4 MB"
    },
    {
      id: "pptx",
      name: "PowerPoint Presentation",
      description: "Editable PowerPoint file with slides, images, and speaker notes",
      icon: FileSpreadsheet,
      size: "~3-8 MB"
    },
    {
      id: "html",
      name: "Interactive HTML",
      description: "Web-based slideshow with navigation and transitions",
      icon: Globe,
      size: "~1.8 MB"
    },
    {
      id: "video",
      name: "Video Presentation",
      description: "Narrated video with slides and transitions",
      icon: Video,
      size: "~15-50 MB",
      disabled: !isTTSConfigured
    },
    // Only show Google Slides if configured
    ...(isGoogleSlidesConfigured ? [{
      id: "google-slides",
      name: "Google Slides",
      description: "Live collaborative presentation in Google Slides",
      icon: Globe,
      size: "Live"
    }] : [])
  ];

  const handleFormatSelect = (formatId: string) => {
    setSelectedFormat(formatId);
  };

  const handleExport = async () => {
    if (!selectedFormat) {
      return;
    }

    setIsExporting(true);
    
    try {
      if (selectedFormat === 'video') {
        // Get video options from form
        const formData = form.getValues();
        const videoOptions: VideoExportOptions = {
          format: formData.format,
          quality: formData.quality,
          voice: formData.voice,
          ttsModel: formData.ttsModel || 'tts-1',
          transition: {
            type: 'crossfade',
            duration: 0.5
          }
        };
        await onExport(selectedFormat, videoOptions);
      } else {
        await onExport(selectedFormat);
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getQualityDescription = (quality: string) => {
    switch (quality) {
      case 'high':
        return '1080p • Best quality • Larger file size';
      case 'medium':
        return '720p • Good quality • Moderate file size';
      case 'low':
        return '480p • Fast export • Smaller file size';
      default:
        return '';
    }
  };

  const getVoiceDescription = (voice: string) => {
    const descriptions: Record<string, string> = {
      alloy: 'Balanced and clear',
      echo: 'Warm and expressive',
      fable: 'Smooth and articulate',
      onyx: 'Deep and authoritative',
      nova: 'Bright and energetic',
      shimmer: 'Soft and pleasant'
    };
    return descriptions[voice] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Download className="w-6 h-6" />
            Export Presentation
          </DialogTitle>
          <DialogDescription>
            Choose your preferred format and customize export settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Select Export Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                const isDisabled = format.disabled;

                return (
                  <Card 
                    key={format.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-primary border-primary' : ''
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover-elevate'}`}
                    onClick={isDisabled ? undefined : () => handleFormatSelect(format.id)}
                    data-testid={`export-format-${format.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{format.name}</h4>
                            {format.size && (
                              <Badge variant="outline" className="text-xs">
                                {format.size}
                              </Badge>
                            )}
                            {isDisabled && (
                              <Badge variant="destructive" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format.description}
                          </p>
                          {isDisabled && format.id === 'video' && (
                            <p className="text-xs text-destructive mt-1">
                              TTS service not configured
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Video Options */}
          {selectedFormat === 'video' && !exportFormats.find(f => f.id === 'video')?.disabled && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Video Export Settings
                </h3>
                
                <Form {...form}>
                  <form className="space-y-6">
                    {/* Video Format */}
                    <FormField
                      control={form.control}
                      name="format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-video-format">
                                <SelectValue placeholder="Select video format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mp4">MP4 - Most compatible</SelectItem>
                              <SelectItem value="avi">AVI - High quality</SelectItem>
                              <SelectItem value="mov">MOV - Apple optimized</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Video Quality */}
                    <FormField
                      control={form.control}
                      name="quality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video Quality</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-video-quality">
                                <SelectValue placeholder="Select video quality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">
                                <div className="flex flex-col items-start">
                                  <span>High Quality</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getQualityDescription('high')}
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex flex-col items-start">
                                  <span>Medium Quality</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getQualityDescription('medium')}
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="low">
                                <div className="flex flex-col items-start">
                                  <span>Low Quality</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getQualityDescription('low')}
                                  </span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Voice Selection */}
                    <FormField
                      control={form.control}
                      name="voice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mic className="w-4 h-4" />
                            Narration Voice
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-voice">
                                <SelectValue placeholder="Select voice for narration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(voice => (
                                <SelectItem key={voice} value={voice}>
                                  <div className="flex flex-col items-start">
                                    <span className="capitalize">{voice}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {getVoiceDescription(voice)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The AI voice that will narrate your presentation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* TTS Model */}
                    <FormField
                      control={form.control}
                      name="ttsModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TTS Quality</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tts-model">
                                <SelectValue placeholder="Select TTS quality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tts-1">
                                <div className="flex flex-col items-start">
                                  <span>Standard (TTS-1)</span>
                                  <span className="text-xs text-muted-foreground">
                                    Faster generation, good quality
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="tts-1-hd">
                                <div className="flex flex-col items-start">
                                  <span>High Definition (TTS-1-HD)</span>
                                  <span className="text-xs text-muted-foreground">
                                    Best quality, slower generation
                                  </span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </>
          )}

          {/* Export Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedFormat && (
                <span>
                  Selected: <strong>{exportFormats.find(f => f.id === selectedFormat)?.name}</strong>
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isExporting}
                data-testid="button-cancel-export"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={!selectedFormat || isExporting || exportFormats.find(f => f.id === selectedFormat)?.disabled}
                data-testid="button-start-export"
              >
                {isExporting ? (
                  <>
                    <Play className="w-4 h-4 mr-2 animate-spin" />
                    Starting Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {selectedFormat === 'video' ? 'Video' : 'File'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}