import ProcessingStatus from '../ProcessingStatus';

export default function ProcessingStatusExample() {
  return (
    <div className="p-8">
      <ProcessingStatus currentStep="image-generation" />
    </div>
  );
}