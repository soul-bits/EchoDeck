import PresentationOutput from '../PresentationOutput';

export default function PresentationOutputExample() {
  const handleExport = (format: string) => {
    console.log("Exporting format:", format);
  };

  const handleShare = () => {
    console.log("Sharing presentation");
  };

  return (
    <div className="p-8">
      <PresentationOutput 
        title="The Future of AI Presentations"
        slideCount={6}
        estimatedDuration="8 minutes"
        onExport={handleExport}
        onShare={handleShare}
      />
    </div>
  );
}