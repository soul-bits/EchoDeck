import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  image?: string;
}

export default function FeatureCard({ icon: Icon, title, description, image }: FeatureCardProps) {
  return (
    <Card className="hover-elevate transition-all duration-200 h-full">
      <CardContent className="p-6">
        {image && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={image} 
              alt={title} 
              className="w-full h-48 object-cover"
              data-testid={`img-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}
            />
          </div>
        )}
        
        <div className="flex items-center mb-4">
          <div className="p-3 rounded-lg bg-primary/10 mr-4">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold" data-testid={`text-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {title}
          </h3>
        </div>
        
        <p className="text-muted-foreground leading-relaxed" data-testid={`text-description-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
}