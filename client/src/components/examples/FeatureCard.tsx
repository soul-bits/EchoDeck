import FeatureCard from '../FeatureCard';
import { Mic } from "lucide-react";
import audioImage from "@assets/generated_images/Audio_processing_feature_illustration_9348ffe4.png";

export default function FeatureCardExample() {
  return (
    <div className="max-w-sm">
      <FeatureCard
        icon={Mic}
        title="Voice Recognition"
        description="Advanced AI-powered transcription that captures every word with precision and converts your spoken ideas into structured content."
        image={audioImage}
      />
    </div>
  );
}