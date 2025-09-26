import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PenTool, Sparkles } from "lucide-react";

interface TextPromptInputProps {
  onPromptReady?: (prompt: string, skipImages: boolean) => void;
}

export default function TextPromptInput({ onPromptReady }: TextPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [skipImages, setSkipImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      alert("Please enter a presentation topic");
      return;
    }

    if (prompt.trim().length < 10) {
      alert("Please provide a more detailed description (at least 10 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      await onPromptReady?.(prompt.trim(), skipImages);
    } catch (error) {
      console.error("Failed to process prompt:", error);
      alert("Failed to create presentation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Write Your Presentation Topic</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe what you want your presentation to be about
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt-textarea">Presentation Topic</Label>
          <Textarea
            id="prompt-textarea"
            data-testid="textarea-prompt"
            placeholder="Example: Create a presentation explaining why the sky is blue, including the science behind light scattering, atmospheric composition, and visual examples."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className="resize-none"
            maxLength={1000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tip: Press Ctrl/Cmd + Enter to submit</span>
            <span>{prompt.length}/1000</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            id="skip-images"
            data-testid="checkbox-skip-images"
            checked={skipImages}
            onCheckedChange={(checked) => setSkipImages(checked as boolean)}
          />
          <div className="flex-1">
            <Label htmlFor="skip-images" className="text-sm font-medium cursor-pointer">
              Skip image generation (faster)
            </Label>
            <p className="text-xs text-muted-foreground">
              Generate text-only slides without AI images for quicker results
            </p>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!prompt.trim() || isSubmitting}
          className="w-full h-12"
          data-testid="button-create-presentation"
        >
          {isSubmitting ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Creating Presentation...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Create Presentation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}