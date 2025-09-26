import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import AudioRecorder from "@/components/AudioRecorder";
import TextPromptInput from "@/components/TextPromptInput";
import StyleSelector, { PresentationStyle } from "@/components/StyleSelector";
import ProcessingStatus, { ProcessingStep } from "@/components/ProcessingStatus";
import PresentationOutput from "@/components/PresentationOutput";
import ThemeToggle from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPresentation, uploadAudio, getPresentationStatus, exportPresentation, getPresentationWithSlides, getExportStatus, downloadExport, type VideoExportOptions, type ExportJobResponse } from "@/lib/api";

type AppState = "landing" | "recording" | "processing" | "output";

export default function Home() {
  const [currentState, setCurrentState] = useState<AppState>("landing");
  const [selectedStyle, setSelectedStyle] = useState<PresentationStyle>("ted-talk");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("transcription");
  const [presentationId, setPresentationId] = useState<string>("");
  const [activeExportId, setActiveExportId] = useState<string>("");
  const [exportError, setExportError] = useState<string>("");

  // Poll for presentation status when processing
  const { data: statusData } = useQuery({
    queryKey: ['presentation-status', presentationId],
    queryFn: () => getPresentationStatus(presentationId),
    enabled: currentState === "processing" && !!presentationId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Fetch full presentation data including slides when completed
  const { data: presentationData } = useQuery({
    queryKey: ['presentation-with-slides', presentationId],
    queryFn: () => getPresentationWithSlides(presentationId),
    enabled: currentState === "output" && !!presentationId,
  });

  // React to status changes
  useEffect(() => {
    if (statusData) {
      if (statusData.processingStep) {
        setProcessingStep(statusData.processingStep);
      }
      if (statusData.status === "completed") {
        setCurrentState("output");
      } else if (statusData.status === "error") {
        console.error("Presentation processing failed");
        setCurrentState("landing");
      }
    }
  }, [statusData]);

  const handleAudioReady = async (audioFile: File, skipImages?: boolean) => {
    try {
      console.log("Audio ready, creating presentation...", {
        fileName: audioFile.name,
        fileType: audioFile.type,
        fileSize: audioFile.size
      });
      
      // Create presentation
      const presentation = await createPresentation({
        title: "AI-Generated Presentation",
        style: selectedStyle,
        skipImages: skipImages || false,
      });
      
      console.log("Presentation created:", presentation.id);
      setPresentationId(presentation.id);
      setCurrentState("processing");
      
      // Upload audio file (use the file as-is, don't convert)
      console.log("Uploading audio file...");
      await uploadAudio(presentation.id, audioFile);
      console.log("Audio upload completed");
      
    } catch (error) {
      console.error("Failed to process audio:", error);
      alert("Failed to process audio. Please try again.");
    }
  };

  const handlePromptReady = async (prompt: string, skipImages: boolean) => {
    try {
      console.log("Prompt ready, creating presentation...", {
        prompt,
        skipImages,
        style: selectedStyle
      });
      
      // Create presentation from text prompt
      const presentation = await createPresentation({
        title: "AI-Generated Presentation",
        style: selectedStyle,
        textPrompt: prompt,
        skipImages: skipImages,
      });
      
      console.log("Presentation created:", presentation.id);
      setPresentationId(presentation.id);
      setCurrentState("processing");
      
    } catch (error) {
      console.error("Failed to process prompt:", error);
      alert("Failed to create presentation. Please try again.");
    }
  };

  const handleStyleChange = (style: PresentationStyle) => {
    setSelectedStyle(style);
    console.log("Style changed to:", style);
  };

  const handleStartOver = () => {
    setCurrentState("landing");
    setProcessingStep("transcription");
    console.log("Starting over");
  };

  const handleExport = async (format: string, options?: VideoExportOptions) => {
    if (!presentationId) {
      alert("No presentation available for export");
      return;
    }
    
    try {
      console.log("Exporting presentation as:", format, options);
      const result: ExportJobResponse = await exportPresentation(presentationId, format, options);
      console.log("Export started:", result);
      
      if (result?.exportId) {
        if (format === 'video') {
          // For video exports, track progress
          setActiveExportId(result.exportId);
          setExportError("");
        } else {
          // For non-video exports, download immediately
          try {
            await downloadExport(result.exportId);
          } catch (downloadError) {
            console.error("Download failed:", downloadError);
            // Fallback to legacy download method
            const downloadUrl = `/api/presentations/${presentationId}/export/${result.exportId}/download`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `presentation.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Export failed. Please try again.";
      alert(errorMessage);
      setExportError(errorMessage);
    }
  };

  const handleExportComplete = (exportId: string) => {
    console.log("Export completed:", exportId);
    setActiveExportId("");
    setExportError("");
    // Optionally show a success message or trigger download
  };

  const handleExportError = (error: string) => {
    console.error("Export error:", error);
    setActiveExportId("");
    setExportError(error);
    alert(`Export failed: ${error}`);
  };

  const handleCancelExport = () => {
    console.log("Export cancelled");
    setActiveExportId("");
    setExportError("");
  };

  const handleShare = () => {
    console.log("Sharing presentation");
    // TODO: Implement sharing logic
    alert("Sharing feature coming soon!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-xl" data-testid="text-app-title">EchoDeck</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentState !== "landing" && (
              <button 
                onClick={handleStartOver}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-start-over"
              >
                Start Over
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {currentState === "landing" && (
          <>
            <Hero />
            <Features />
            
            <section className="py-24 px-6 bg-muted/30">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4" data-testid="text-get-started-title">
                    Ready to Create Your Presentation?
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Choose your style and start recording your ideas
                  </p>
                </div>
                
                <div className="space-y-8">
                  <StyleSelector 
                    selectedStyle={selectedStyle}
                    onStyleChange={handleStyleChange}
                  />
                  
                  <Tabs defaultValue="audio" className="w-full max-w-4xl mx-auto">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="audio" data-testid="tab-audio">Record Audio</TabsTrigger>
                      <TabsTrigger value="text" data-testid="tab-text">Write Prompt</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="audio" className="mt-8">
                      <div className="flex justify-center">
                        <AudioRecorder onAudioReady={handleAudioReady} />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="text" className="mt-8">
                      <TextPromptInput onPromptReady={handlePromptReady} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </section>
          </>
        )}

        {currentState === "recording" && (
          <section className="py-24 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-8" data-testid="text-recording-title">
                Record Your Presentation
              </h2>
              <AudioRecorder onAudioReady={handleAudioReady} />
            </div>
          </section>
        )}

        {currentState === "processing" && (
          <section className="py-24 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4" data-testid="text-processing-title">
                  Creating Your Presentation
                </h2>
                <p className="text-lg text-muted-foreground">
                  Our AI is working hard to transform your ideas into a stunning presentation
                </p>
              </div>
              
              <ProcessingStatus 
                currentStep={processingStep}
                status={statusData?.status}
              />
            </div>
          </section>
        )}

        {currentState === "output" && (
          <section className="py-24 px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="text-output-title">
                Your Presentation is Ready!
              </h2>
              <p className="text-lg text-muted-foreground">
                Review, customize, and export in your preferred format
              </p>
            </div>
            
            <PresentationOutput 
              presentationId={presentationId}
              title={presentationData?.title || statusData?.title || "AI-Generated Presentation"}
              slideCount={presentationData?.slideCount || statusData?.slideCount}
              estimatedDuration={presentationData?.estimatedDuration || statusData?.estimatedDuration}
              transcriptionText={presentationData?.transcriptText || statusData?.transcriptText}
              slides={presentationData?.slides || []}
              onExport={handleExport}
              onShare={handleShare}
              activeExportId={activeExportId}
              onExportComplete={handleExportComplete}
              onExportError={handleExportError}
              onCancelExport={handleCancelExport}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground">
            Powered by OpenAI's advanced AI models • Built with modern web technologies
          </p>
        </div>
      </footer>
    </div>
  );
}