import StyleSelector from '../StyleSelector';

export default function StyleSelectorExample() {
  const handleStyleChange = (style: string) => {
    console.log("Style changed to:", style);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <StyleSelector onStyleChange={handleStyleChange} />
    </div>
  );
}