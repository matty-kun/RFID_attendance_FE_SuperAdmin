import React, { useEffect, useState } from 'react';
import hawiCelebrateImg from '../../assets/illustrations/Hawi Celebrate.png';
import hawiWavingImg from '../../assets/illustrations/Hawi Waving.png';

export type TransitionDirection = 'ltr' | 'rtl';

export interface WaveTransitionProps {
  direction: TransitionDirection;
  phase: 'enter' | 'exit';
  message?: string;
}

export const WaveTransition: React.FC<WaveTransitionProps> = ({
  direction,
  phase,
  message,
}) => {
  const isLtr = direction === 'ltr';
  const [animating, setAnimating] = useState(false);

  // Trigger animation right after mount so CSS transition executes
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimating(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Compute transform offset for each state
  const getTransform = () => {
    if (phase === 'enter') {
      if (!animating) {
        // Start offscreen
        return isLtr ? 'translate3d(-105vw, 0, 0)' : 'translate3d(105vw, 0, 0)';
      }
      // Enter to center (covering screen)
      return 'translate3d(0, 0, 0)';
    } else {
      // Exit phase: sweeps out to the opposite side
      return isLtr ? 'translate3d(105vw, 0, 0)' : 'translate3d(-105vw, 0, 0)';
    }
  };

  const getTransitionStyle = (index: number) => {
    const delay = phase === 'enter' ? index * 45 : index * 40;
    return {
      transform: getTransform(),
      transition: `transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      willChange: 'transform',
    };
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99999] pointer-events-none select-none overflow-hidden"
    >
      {/* Wave Layer 1 (Electric Violet - Front Runner) */}
      <div
        style={getTransitionStyle(0)}
        className="absolute inset-y-0 w-[110vw] -left-[5vw] flex items-stretch z-10"
      >
        {!isLtr && (
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-24 sm:w-36 md:w-48 text-[#A855F7] shrink-0 -mr-[1px]"
          >
            <path d="M100,0 C30,160 0,320 50,500 C100,680 15,820 100,1000 Z" fill="currentColor" />
          </svg>
        )}
        <div className="flex-1 bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#9333EA] shadow-2xl" />
        {isLtr && (
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-24 sm:w-36 md:w-48 text-[#9333EA] shrink-0 -ml-[1px]"
          >
            <path d="M0,0 C70,160 100,320 50,500 C0,680 85,820 0,1000 Z" fill="currentColor" />
          </svg>
        )}
      </div>

      {/* Wave Layer 2 (Vibrant Brand Purple - Mid Wave) */}
      <div
        style={getTransitionStyle(1)}
        className="absolute inset-y-0 w-[110vw] -left-[5vw] flex items-stretch z-20"
      >
        {!isLtr && (
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-24 sm:w-36 md:w-48 text-[#8B2CCB] shrink-0 -mr-[1px]"
          >
            <path d="M100,0 C70,140 10,290 60,470 C110,650 25,790 100,1000 Z" fill="currentColor" />
          </svg>
        )}
        <div className="flex-1 bg-gradient-to-r from-[#9333EA] via-[#8B2CCB] to-[#7026B7] shadow-2xl" />
        {isLtr && (
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-24 sm:w-36 md:w-48 text-[#7026B7] shrink-0 -ml-[1px]"
          >
            <path d="M0,0 C30,140 90,290 40,470 C-10,650 75,790 0,1000 Z" fill="currentColor" />
          </svg>
        )}
      </div>

      {/* Wave Layer 3 (Deep Plum - Base Wave with Hawi Badge) */}
      <div
        style={getTransitionStyle(2)}
        className="absolute inset-y-0 w-[110vw] -left-[5vw] flex items-stretch z-30"
      >
        {!isLtr && (
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-24 sm:w-36 md:w-48 text-[#451475] shrink-0 -mr-[1px]"
          >
            <path d="M100,0 C20,200 80,360 30,540 C-20,720 70,860 100,1000 Z" fill="currentColor" />
          </svg>
        )}

        <div className="flex-1 bg-gradient-to-r from-[#451475] via-[#351059] to-[#24133F] relative flex items-center justify-center shadow-2xl">
          {/* Centered Celebration Badge */}
          <div
            className={`flex flex-col items-center justify-center text-center px-6 transition-all duration-300 ${
              phase === 'enter' && animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <img
              src={isLtr ? hawiCelebrateImg : hawiWavingImg}
              alt="Hawi"
              className="h-28 w-28 sm:h-32 sm:w-32 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] animate-bounce"
              style={{ animationDuration: '1.2s' }}
            />
            <h2 className="mt-2 text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-sm">
              {isLtr ? 'Welcome to Super Admin' : 'Signed Out'}
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-md border border-white/20 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#17B556] animate-ping" />
              <span>{message || (isLtr ? 'Loading Dashboard…' : 'Returning to Login…')}</span>
            </div>
          </div>
        </div>

        {isLtr && (
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-24 sm:w-36 md:w-48 text-[#24133F] shrink-0 -ml-[1px]"
          >
            <path d="M0,0 C80,200 20,360 70,540 C120,720 30,860 0,1000 Z" fill="currentColor" />
          </svg>
        )}
      </div>
    </div>
  );
};
