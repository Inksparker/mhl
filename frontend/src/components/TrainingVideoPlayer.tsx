import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react';

export interface Slide {
  title?: string;
  text: string;
  highlight?: string;
  icon?: string;
  color?: string;
}

interface TrainingVideoProps {
  title: string;
  slides: Slide[];
  autoPlay?: boolean;
}

export default function TrainingVideoPlayer({ title, slides, autoPlay = false }: TrainingVideoProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideDuration = 4000; // 4 seconds per slide

  const totalSlides = slides.length;
  const isLast = currentSlide === totalSlides - 1;
  const isFirst = currentSlide === 0;

  // Auto-advance
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / slideDuration) * 100));

      if (elapsed >= slideDuration) {
        if (isLast) {
          setIsPlaying(false);
          setProgress(100);
        } else {
          setCurrentSlide((prev) => prev + 1);
          setProgress(0);
          start = Date.now();
        }
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentSlide, isLast]);

  const goNext = () => {
    if (!isLast) {
      setCurrentSlide((prev) => prev + 1);
      setProgress(0);
    }
  };

  const goPrev = () => {
    if (!isFirst) {
      setCurrentSlide((prev) => prev - 1);
      setProgress(0);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    setProgress(0);
  };

  const restart = () => {
    setCurrentSlide(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const slide = slides[currentSlide];

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Video area */}
      <div className="aspect-video relative flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-8">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Slide content */}
        <div className="relative z-10 text-center max-w-lg animate-fadeIn">
          {/* Icon */}
          {slide.icon && (
            <div className={`text-5xl mb-4 animate-bounceIn ${slide.color || 'text-blue-400'}`}>
              {slide.icon}
            </div>
          )}

          {/* Title */}
          {slide.title && (
            <h3 className="text-xl font-bold text-white mb-3 animate-slideUp">
              {slide.title}
            </h3>
          )}

          {/* Main text */}
          <p className="text-lg text-gray-200 leading-relaxed animate-slideUp" style={{ animationDelay: '0.2s' }}>
            {slide.text}
          </p>

          {/* Highlight */}
          {slide.highlight && (
            <div className="mt-4 inline-block px-4 py-2 bg-white/10 rounded-lg border border-white/20 animate-slideUp" style={{ animationDelay: '0.4s' }}>
              <code className="text-sm text-green-300">{slide.highlight}</code>
            </div>
          )}
        </div>

        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slide counter */}
        <div className="absolute top-3 right-3 text-xs text-gray-500 bg-black/30 px-2 py-1 rounded">
          {currentSlide + 1} / {totalSlides}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 truncate max-w-[200px]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={restart}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Restart"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
            title="Previous"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors mx-1"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={goNext}
            disabled={isLast}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
            title="Next"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1 ml-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setProgress(0); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide ? 'bg-blue-500 w-4' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="w-16" /> {/* Spacer for symmetry */}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.5); } 60% { transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
        .animate-slideUp { animation: slideUp 0.6s ease-out both; }
        .animate-bounceIn { animation: bounceIn 0.5s ease-out; }
      `}</style>
    </div>
  );
}
