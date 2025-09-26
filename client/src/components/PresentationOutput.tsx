import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, Share2, FileText, Globe, Video } from "lucide-react";
import SlidePreview from "./SlidePreview";
import ExportDialog from "./ExportDialog";
import VideoExportProgress from "./VideoExportProgress";
import type { VideoExportOptions } from "@/lib/api";

interface PresentationOutputProps {
  presentationId?: string;
  title?: string;
  slideCount?: number;
  estimatedDuration?: string;
  transcriptionText?: string;
  slides?: any[];
  onExport?: (format: string, options?: VideoExportOptions) => void;
  onShare?: () => void;
  activeExportId?: string;
  onExportComplete?: (exportId: string) => void;
  onExportError?: (error: string) => void;
  onCancelExport?: () => void;
}

export default function PresentationOutput({ 
  presentationId,
  title = "AI-Generated Presentation",
  slideCount = 6,
  estimatedDuration = "8 minutes",
  transcriptionText,
  slides = [],
  onExport,
  onShare,
  activeExportId,
  onExportComplete,
  onExportError,
  onCancelExport
}: PresentationOutputProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showExportDialog, setShowExportDialog] = useState(false);

  // TODO: Remove mock data when connecting to real API
  const mockSlides = [
    {
      id: "slide-1",
      title: "Introduction: The AI Revolution",
      bulletPoints: [
        "AI is transforming how we create content",
        "Voice-to-presentation technology is the next frontier",
        "Democratizing professional presentation design"
      ],
      imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop",
      speakerNotes: "Start with energy and enthusiasm. Establish credibility and set expectations for the presentation."
    },
    {
      id: "slide-2", 
      title: "The Traditional Presentation Problem",
      bulletPoints: [
        "Average prep time: 6-8 hours per presentation",
        "Design skills required for professional results",
        "Inconsistent quality across team members"
      ],
      imageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=200&fit=crop",
      speakerNotes: "Connect with audience pain points. Most people can relate to presentation creation struggles."
    },
    {
      id: "slide-3",
      title: "Introducing EchoDeck: Your AI Presentation Partner",
      bulletPoints: [
        "Speak for 3-5 minutes, get a full presentation",
        "Professional visuals generated automatically",
        "Multiple export formats for any use case"
      ],
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
      speakerNotes: "This is the main value proposition. Emphasize the simplicity and power of the solution."
    }
  ];

  // Check if Google Slides is available from server config
  const { data: config } = useQuery({
    queryKey: ['/api/config'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const isGoogleSlidesConfigured = config?.googleSlidesEnabled || false;

  // Show loading state while config is being fetched
  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading export options...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const isTTSConfigured = config?.ttsEnabled || false;

  const exportFormats = [
    {
      id: "pdf",
      name: "PDF Document",
      description: "Professional document format for printing and sharing",
      icon: FileText,
      size: "2.4 MB"
    },
    {
      id: "html",
      name: "Interactive HTML",
      description: "Web-based slideshow with navigation and transitions",
      icon: Globe,
      size: "1.8 MB"
    },
    {
      id: "video",
      name: "Video Presentation",
      description: "Narrated video with slides and transitions",
      icon: Video,
      size: "15-50 MB",
      disabled: !isTTSConfigured
    },
    // Only show Google Slides option if configured
    ...(isGoogleSlidesConfigured ? [{
      id: "google-slides",
      name: "Google Slides",
      description: "Live collaborative presentation in Google Slides",
      icon: Globe,
      size: "Live"
    }] : [])
  ];

  const handleExportClick = () => {
    setShowExportDialog(true);
  };

  const handleExport = async (format: string, options?: VideoExportOptions) => {
    if (!presentationId) {
      alert("No presentation ID available for export");
      return;
    }
    
    try {
      console.log(`Exporting presentation as:`, format, options);
      await onExport?.(format, options);
      setShowExportDialog(false);
    } catch (error) {
      console.error(`Export failed:`, error);
      alert(`Failed to export as ${format}. Please try again.`);
    }
  };

  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
  };

  const handleShare = () => {
    console.log("Sharing presentation");
    onShare?.();
  };

  const handlePreview = (slideId: string) => {
    console.log(`Previewing slide: ${slideId}`);
  };

  const handleEdit = (slideId: string) => {
    console.log(`Editing slide: ${slideId}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl" data-testid="text-presentation-title">
                {title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" data-testid="badge-slide-count">
                  {slideCount} slides
                </Badge>
                <Badge variant="outline" data-testid="badge-duration">
                  ~{estimatedDuration}
                </Badge>
                <Badge className="bg-green-600" data-testid="badge-status">
                  Ready to Export
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleShare}
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                onClick={handleExportClick}
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="slides" data-testid="tab-slides">Slides</TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                    <Button 
                      size="lg"
                      onClick={() => handlePreview("full-presentation")}
                      data-testid="button-preview-full"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Preview Full Presentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {transcriptionText && (
                <Card>
                  <CardHeader>
                    <CardTitle>Original Transcript</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-y-auto bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed" data-testid="text-transcription">
                        {transcriptionText}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audio processed:</span>
                    <span className="font-medium">3m 42s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Words transcribed:</span>
                    <span className="font-medium">687</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Images generated:</span>
                    <span className="font-medium">{slideCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style:</span>
                    <span className="font-medium">TED Talk</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="slides" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(slides.length > 0 ? slides : mockSlides).map((slide, index) => (
              <SlidePreview
                key={slide.id}
                slide={slide}
                slideNumber={index + 1}
                onEdit={handleEdit}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          {activeExportId ? (
            // Show video export progress if there's an active export
            <div className="flex justify-center">
              <VideoExportProgress
                exportId={activeExportId}
                onComplete={onExportComplete || (() => {})}
                onError={onExportError || (() => {})}
                onCancel={onCancelExport}
              />
            </div>
          ) : (
            // Show export format cards
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isDisabled = format.disabled;
                return (
                  <Card key={format.id} className={`transition-all duration-200 ${
                    isDisabled ? 'opacity-50' : 'hover-elevate'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className={`p-3 rounded-lg mr-4 ${
                          isDisabled ? 'bg-muted/50' : 'bg-primary/10'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            isDisabled ? 'text-muted-foreground' : 'text-primary'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold" data-testid={`text-export-name-${format.id}`}>
                            {format.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {format.size}
                          </p>
                          {isDisabled && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Disabled
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4" data-testid={`text-export-description-${format.id}`}>
                        {format.description}
                      </p>
                      
                      {isDisabled && format.id === 'video' && (
                        <p className="text-xs text-destructive mb-4">
                          TTS service not configured
                        </p>
                      )}
                      
                      <Button 
                        onClick={format.id === 'video' || format.id === 'google-slides' ? handleExportClick : () => handleExport(format.id)}
                        className="w-full"
                        disabled={isDisabled}
                        data-testid={`button-export-${format.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export {format.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      {presentationId && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          presentationId={presentationId}
          onExport={handleExport}
          onClose={handleCloseExportDialog}
        />
      )}
    </div>
  );
}