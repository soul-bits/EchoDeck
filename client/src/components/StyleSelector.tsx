import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Presentation, Building, BookOpen } from "lucide-react";

export type PresentationStyle = "ted-talk" | "corporate-pitch" | "storybook";

interface StyleOption {
  id: PresentationStyle;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  color: string;
}

interface StyleSelectorProps {
  selectedStyle?: PresentationStyle;
  onStyleChange?: (style: PresentationStyle) => void;
}

export default function StyleSelector({ selectedStyle = "ted-talk", onStyleChange }: StyleSelectorProps) {
  const [selected, setSelected] = useState<PresentationStyle>(selectedStyle);

  const styles: StyleOption[] = [
    {
      id: "ted-talk",
      name: "TED Talk",
      description: "Inspiring and engaging presentation style with storytelling focus",
      icon: Presentation,
      features: ["Large visuals", "Minimal text", "Story-driven", "Emotional appeal"],
      color: "text-blue-600"
    },
    {
      id: "corporate-pitch",
      name: "Corporate Pitch",
      description: "Professional business presentation with data and clear structure",
      icon: Building,
      features: ["Data-focused", "Executive summary", "Charts & graphs", "ROI emphasis"],
      color: "text-green-600"
    },
    {
      id: "storybook",
      name: "Storybook",
      description: "Creative narrative style with rich visuals and flowing content",
      icon: BookOpen,
      features: ["Visual narrative", "Creative layouts", "Artistic style", "Flow-focused"],
      color: "text-purple-600"
    }
  ];

  const handleStyleSelect = (style: PresentationStyle) => {
    console.log(`Selected style: ${style}`);
    setSelected(style);
    onStyleChange?.(style);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4" data-testid="text-style-selector-title">
        Choose Your Presentation Style
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {styles.map((style) => {
          const Icon = style.icon;
          const isSelected = selected === style.id;
          
          return (
            <Card 
              key={style.id}
              className={`cursor-pointer transition-all duration-200 hover-elevate ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleStyleSelect(style.id)}
              data-testid={`card-style-${style.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-lg bg-primary/10 mr-3 ${style.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid={`text-style-name-${style.id}`}>
                      {style.name}
                    </h4>
                    {isSelected && (
                      <Badge className="mt-1 text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4" data-testid={`text-style-description-${style.id}`}>
                  {style.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {style.features.map((feature, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs"
                      data-testid={`badge-feature-${style.id}-${index}`}
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-sm text-muted-foreground">
        Selected style will influence the AI's approach to creating your slides, 
        including layout, tone, and visual elements.
      </div>
    </div>
  );
}