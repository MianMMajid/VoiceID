import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play } from "lucide-react";
import { Card } from "@/components/ui/card";

export function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<"human" | "bot" | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "rgb(255, 255, 255)";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = "#00CC70"; // Dimmed green for better readability
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      // Calculate audio level
      const sum = dataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0);
      const avg = sum / bufferLength;
      setAudioLevel(avg / 128);
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 2048;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        setIsRecording(false);
        setHasRecorded(true);
        setIsAnalyzing(true);
        
        // Simulate analysis
        setTimeout(() => {
          setResult(Math.random() > 0.5 ? "human" : "bot");
          setIsAnalyzing(false);
        }, 1500);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      drawWaveform();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const reset = () => {
    setHasRecorded(false);
    setResult(null);
    setAudioLevel(0);
  };

  return (
    <Card className="max-w-4xl mx-auto rounded-2xl border-4 border-neon-green bg-gradient-to-br from-neon-green/10 to-emerald-500/10 p-8 shadow-glow-neon-strong" data-testid="card-voice-recorder">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full max-w-2xl rounded-lg bg-white border-2 border-neon-green/30"
          data-testid="canvas-waveform"
        />

        {/* Status Display */}
        <div className="text-center">
          {!hasRecorded && !isRecording && (
            <div className="flex flex-col items-center space-y-2">
              <Mic className="w-16 h-16 text-neon-green" data-testid="icon-mic-ready" />
              <p className="text-xl font-bold text-black">Click to Start Recording</p>
              <p className="text-sm text-black/70">Speak a short phrase to verify you're human</p>
            </div>
          )}
          
          {isRecording && (
            <div className="flex flex-col items-center space-y-2">
              <Mic className="w-16 h-16 text-neon-green animate-pulse" data-testid="icon-mic-recording" />
              <p className="text-xl font-bold text-black">Recording...</p>
              <div className="w-48 h-2 bg-black/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-neon-green transition-all duration-100"
                  style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                  data-testid="bar-audio-level"
                />
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin" data-testid="spinner-analyzing" />
              <p className="text-xl font-bold text-black">Analyzing voice patterns...</p>
            </div>
          )}

          {result === "human" && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-neon-green rounded-full flex items-center justify-center">
                <span className="text-3xl text-black" data-testid="icon-result-human">✓</span>
              </div>
              <p className="text-2xl font-black text-neon-green">Verified Human!</p>
              <p className="text-sm text-black/70">99.8% confidence - Access granted</p>
            </div>
          )}

          {result === "bot" && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-3xl text-white" data-testid="icon-result-bot">✕</span>
              </div>
              <p className="text-2xl font-black text-red-500">Bot Detected!</p>
              <p className="text-sm text-black/70">Suspicious voice patterns - Access denied</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!isRecording && !hasRecorded && (
            <Button
              size="lg"
              className="bg-neon-green text-black border-neon-green font-bold"
              onClick={startRecording}
              data-testid="button-start-recording"
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button
              size="lg"
              variant="destructive"
              onClick={stopRecording}
              data-testid="button-stop-recording"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Recording
            </Button>
          )}

          {hasRecorded && !isAnalyzing && (
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-neon-green text-black"
              onClick={reset}
              data-testid="button-try-again"
            >
              <Play className="w-5 h-5 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
