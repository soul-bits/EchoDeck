import AudioRecorder from '../AudioRecorder';

export default function AudioRecorderExample() {
  const handleAudioReady = (audioBlob: Blob) => {
    console.log("Audio received:", audioBlob);
  };

  return (
    <div className="p-8">
      <AudioRecorder onAudioReady={handleAudioReady} />
    </div>
  );
}