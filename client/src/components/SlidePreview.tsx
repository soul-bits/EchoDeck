import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Download } from "lucide-react";

interface SlideData {
  id: string;
  title: string;
  bulletPoints: string[];
  imageUrl?: string;
  speakerNotes: string;
}

interface SlidePreviewProps {
  slide: SlideData;
  slideNumber: number;
  onEdit?: (slideId: string) => void;
  onPreview?: (slideId: string) => void;
}

export default function SlidePreview({ slide, slideNumber, onEdit, onPreview }: SlidePreviewProps) {
  const handleEdit = () => {
    console.log(`Editing slide ${slide.id}`);
    onEdit?.(slide.id);
  };

  const handlePreview = () => {
    console.log(`Previewing slide ${slide.id}`);
    onPreview?.(slide.id);
  };

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" data-testid={`badge-slide-number-${slide.id}`}>
            Slide {slideNumber}
          </Badge>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handlePreview}
              data-testid={`button-preview-${slide.id}`}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleEdit}
              data-testid={`button-edit-${slide.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {slide.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden bg-muted">
            <img 
              src={slide.imageUrl} 
              alt={slide.title}
              className="w-full h-32 object-cover"
              data-testid={`img-slide-${slide.id}`}
            />
          </div>
        )}

        <h3 className="font-semibold mb-3 line-clamp-2" data-testid={`text-slide-title-${slide.id}`}>
          {slide.title}
        </h3>

        <ul className="text-sm text-muted-foreground space-y-1 mb-4">
          {slide.bulletPoints.slice(0, 3).map((point, index) => (
            <li key={index} className="flex items-start" data-testid={`text-bullet-${slide.id}-${index}`}>
              <span className="mr-2">•</span>
              <span className="line-clamp-1">{point}</span>
            </li>
          ))}
          {slide.bulletPoints.length > 3 && (
            <li className="text-xs text-muted-foreground/70">
              +{slide.bulletPoints.length - 3} more points
            </li>
          )}
        </ul>

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-speaker-notes-${slide.id}`}>
            <strong>Notes:</strong> {slide.speakerNotes}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}