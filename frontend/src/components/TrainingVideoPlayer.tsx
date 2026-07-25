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
    <div className="rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: '#111827' }}>
      {/* Video area */}
      <div className="relative flex items-center justify-center" style={{ minHeight: '280px', padding: '32px', background: 'linear-gradient(135deg, #1f2937, #111827)' }}>
        {/* Background grid */}
        <div className="absolute inset-0" style={{ opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Slide content */}
        <div key={currentSlide} className="relative text-center" style={{ maxWidth: '480px', zIndex: 10 }}>
          {slide.icon && (
            <div style={{ fontSize: '48px', marginBottom: '16px', lineHeight: 1 }}>
              {slide.icon}
            </div>
          )}
          {slide.title && (
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              {slide.title}
            </h3>
          )}
          <p style={{ fontSize: '16px', color: '#d1d5db', lineHeight: 1.6 }}>
            {slide.text}
          </p>
          {slide.highlight && (
            <div style={{ marginTop: '16px', display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <code style={{ fontSize: '14px', color: '#6ee7b7' }}>{slide.highlight}</code>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#1f2937', borderTop: '1px solid #374151' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={restart} style={btnStyle} title="Restart"><SkipBack className="w-4 h-4" /></button>
          <button onClick={goPrev} disabled={isFirst} style={{ ...btnStyle, opacity: isFirst ? 0.3 : 1 }} title="Previous"><SkipBack className="w-3.5 h-3.5" /></button>
          <button onClick={togglePlay} style={{ padding: '8px', background: '#2563eb', color: '#fff', borderRadius: '50%', border: 'none', cursor: 'pointer', margin: '0 4px' }} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" style={{ marginLeft: 2 }} />}
          </button>
          <button onClick={goNext} disabled={isLast} style={{ ...btnStyle, opacity: isLast ? 0.3 : 1 }} title="Next"><SkipForward className="w-3.5 h-3.5" /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setProgress(0); }}
                style={{
                  width: i === currentSlide ? '16px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === currentSlide ? '#3b82f6' : '#4b5563',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ width: '64px' }} />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px',
  color: '#9ca3af',
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
