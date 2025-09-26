import { Button } from "@/components/ui/button";
import { Mic, Upload, Sparkles } from "lucide-react";
import heroImage from "@assets/generated_images/AI_presentation_workspace_hero_2f0e1ca2.png";

export default function Hero() {
  const handleStartRecording = () => {
    // Scroll to the recording section and switch to audio tab
    const recordingSection = document.querySelector('[data-testid="tab-audio"]');
    if (recordingSection) {
      // First click the audio tab to make sure it's active
      (recordingSection as HTMLElement).click();
      
      // Then scroll to the section smoothly
      recordingSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  const handleUploadFile = () => {
    // Scroll to the recording section (audio tab includes file upload)
    const recordingSection = document.querySelector('[data-testid="tab-audio"]');
    if (recordingSection) {
      // First click the audio tab to make sure it's active
      (recordingSection as HTMLElement).click();
      
      // Then scroll to the section smoothly
      recordingSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/85 to-background/95"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-primary mr-3" />
          <span className="text-primary font-semibold text-lg">AI-Powered Presentations</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Turn Your Voice Into
          <br />
          <span className="text-primary">Polished Presentations</span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Simply speak your ideas for 3-5 minutes and let our AI create stunning slide decks 
          with visuals, speaker notes, and professional formatting. Export as PDF, HTML, or video.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg font-semibold min-w-[200px]"
            onClick={handleStartRecording}
            data-testid="button-start-recording"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Recording
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 py-6 text-lg font-semibold min-w-[200px] backdrop-blur-sm"
            onClick={handleUploadFile}
            data-testid="button-upload-file"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Audio
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          Supports MP3, WAV files • Max 5 minutes • Powered by OpenAI
        </div>
      </div>
    </section>
  );
}