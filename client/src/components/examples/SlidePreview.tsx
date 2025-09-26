import SlidePreview from '../SlidePreview';

export default function SlidePreviewExample() {
  const mockSlide = {
    id: "slide-1",
    title: "The Future of AI-Powered Presentations",
    bulletPoints: [
      "Automated content generation reduces preparation time by 80%",
      "AI-generated visuals ensure consistent professional quality",
      "Voice-to-presentation workflow eliminates technical barriers",
      "Multi-format exports enable versatile content distribution"
    ],
    imageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=200&fit=crop",
    speakerNotes: "Begin with a compelling statistic about time savings in presentation creation. Emphasize how AI democratizes professional-quality presentation design for everyone, regardless of design experience."
  };

  const handleEdit = (slideId: string) => {
    console.log("Edit clicked for:", slideId);
  };

  const handlePreview = (slideId: string) => {
    console.log("Preview clicked for:", slideId);
  };

  return (
    <div className="p-8 max-w-sm mx-auto">
      <SlidePreview 
        slide={mockSlide} 
        slideNumber={1} 
        onEdit={handleEdit}
        onPreview={handlePreview}
      />
    </div>
  );
}