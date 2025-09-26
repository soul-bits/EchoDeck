import { Mic, Brain, Image, FileDown, Video, Shield } from "lucide-react";
import FeatureCard from "./FeatureCard";
import audioImage from "@assets/generated_images/Audio_processing_feature_illustration_9348ffe4.png";
import slideImage from "@assets/generated_images/Slide_generation_feature_visual_203803fd.png";

export default function Features() {
  const features = [
    {
      icon: Mic,
      title: "Voice Recognition",
      description: "Advanced AI-powered transcription using OpenAI Whisper that captures every word with precision and converts your spoken ideas into structured content.",
      image: audioImage
    },
    {
      icon: Brain,
      title: "Smart Slide Generation",
      description: "GPT-4o analyzes your transcript and creates professional slide outlines with titles, bullet points, and detailed speaker notes automatically.",
      image: slideImage
    },
    {
      icon: Image,
      title: "AI-Generated Visuals",
      description: "DALL-E 3 creates stunning 16:9 visuals for each slide based on your content, ensuring every presentation looks professional and engaging."
    },
    {
      icon: FileDown,
      title: "Multiple Export Formats",
      description: "Export your presentations as PDF documents, interactive HTML decks, or narrated video presentations with smooth transitions."
    },
    {
      icon: Video,
      title: "Text-to-Speech Narration",
      description: "Generate professional narration for your slides using OpenAI's TTS technology, creating complete video presentations ready to share."
    },
    {
      icon: Shield,
      title: "Content Moderation",
      description: "Built-in safety filtering ensures all generated content meets professional standards and is appropriate for business presentations."
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" data-testid="text-features-title">
            Powered by OpenAI's Latest Technology
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-description">
            Experience the full power of AI with integrated speech, vision, and language models 
            working together to create exceptional presentations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}