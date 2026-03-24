import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterWritingExerciseProps {
  question: string;
  character: string;
  pinyin?: string;
  onAnswer: (isCorrect: boolean, answer: string) => void;
}

export function CharacterWritingExercise({
  question,
  character,
  pinyin,
  onAnswer
}: CharacterWritingExerciseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Set up canvas sizing
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        // Make it a square
        canvasRef.current.width = width;
        canvasRef.current.height = width;
        
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = width / 20; // Scale stroke with canvas size
          ctx.strokeStyle = "#3b82f6"; // Primary color
        }
      }
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Handle touch events
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    // Handle mouse events
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    
    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const checkAnswer = () => {
    if (!hasDrawn || isChecking) return;
    
    setIsChecking(true);
    
    // In a real app, you would send the canvas image data to an OCR API or ML model
    // to verify if the drawn character matches the target character.
    // For this demonstration, we'll assume any attempt (hasDrawn = true) is correct 
    // to simulate the "practice" completion.
    
    setTimeout(() => {
      onAnswer(true, "canvas-drawing-data");
    }, 600);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {question}
        </h2>
        {pinyin && (
          <p className="text-lg text-gray-500 font-medium">{pinyin}</p>
        )}
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden shadow-inner"
      >
        {/* Background character template (faded) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <span className="text-[12rem] md:text-[16rem] font-serif text-gray-400 select-none">
            {character}
          </span>
        </div>
        
        {/* Grid lines to help with writing */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-gray-200 dark:border-gray-700 opacity-50 border-dashed" />
          <div className="border-b border-gray-200 dark:border-gray-700 opacity-50 border-dashed" />
          <div className="border-r border-gray-200 dark:border-gray-700 opacity-50 border-dashed" />
          <div className="" />
        </div>

        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex w-full gap-4">
        <Button
          variant="outline"
          onClick={clearCanvas}
          disabled={!hasDrawn || isChecking}
          className="flex-1 rounded-2xl border-2 h-14 font-bold text-gray-500"
        >
          <Eraser className="w-5 h-5 mr-2" />
          Clear
        </Button>
        <Button
          onClick={checkAnswer}
          disabled={!hasDrawn || isChecking}
          className={cn(
            "flex-1 rounded-2xl h-14 font-bold transition-all",
            !hasDrawn ? "opacity-50" : "bg-primary hover:bg-primary/90"
          )}
        >
          {isChecking ? "Checking..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
