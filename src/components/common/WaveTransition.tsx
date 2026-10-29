import React, { useEffect, useState } from 'react';
import hawiSprintImg from '../../assets/illustrations/Hawi Sprint.png';

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
        // Start completely offscreen
        return isLtr ? 'translate3d(-155vw, 0, 0)' : 'translate3d(155vw, 0, 0)';
      }
      // Enter to center (covering the whole screen with zero gaps)
      return 'translate3d(0, 0, 0)';
    } else {
      // Exit phase: sweeps completely out to the opposite side
      return isLtr ? 'translate3d(155vw, 0, 0)' : 'translate3d(-155vw, 0, 0)';
    }
  };

  const getTransitionStyle = (index: number) => {
    const delay = phase === 'enter' ? index * 75 : index * 60;
    return {
      transform: getTransform(),
      transition: `transform 750ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      willChange: 'transform',
    };
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99999] pointer-events-auto select-none overflow-hidden"
    >
      {/* Wave Layer 1 (Electric Violet - Front Leading Wave) */}
      <div
        style={getTransitionStyle(0)}
        className="absolute inset-y-0 w-[150vw] -left-[25vw] flex items-stretch z-10"
      >
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-28 sm:w-44 md:w-56 text-[#A855F7] shrink-0 -mr-[1px]"
          >
            <path d="M100,0 C30,160 0,320 50,500 C100,680 15,820 100,1000 Z" fill="currentColor" />
          </svg>
        <div className="flex-1 bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#9333EA] shadow-2xl" />
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-28 sm:w-44 md:w-56 text-[#9333EA] shrink-0 -ml-[1px]"
          >
            <path d="M0,0 C70,160 100,320 50,500 C0,680 85,820 0,1000 Z" fill="currentColor" />
          </svg>
      </div>

      {/* Wave Layer 2 (Vibrant Brand Purple - Mid Wave) */}
      <div
        style={getTransitionStyle(1)}
        className="absolute inset-y-0 w-[150vw] -left-[25vw] flex items-stretch z-20"
      >
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-28 sm:w-44 md:w-56 text-[#8B2CCB] shrink-0 -mr-[1px]"
          >
            <path d="M100,0 C70,140 10,290 60,470 C110,650 25,790 100,1000 Z" fill="currentColor" />
          </svg>
        <div className="flex-1 bg-gradient-to-r from-[#9333EA] via-[#8B2CCB] to-[#7026B7] shadow-2xl" />
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-28 sm:w-44 md:w-56 text-[#7026B7] shrink-0 -ml-[1px]"
          >
            <path d="M0,0 C30,140 90,290 40,470 C-10,650 75,790 0,1000 Z" fill="currentColor" />
          </svg>
      </div>

      {/* Wave Layer 3 (Deep Plum - Full Coverage Base Wave with Hawi Sprinting) */}
      <div
        style={getTransitionStyle(2)}
        className="absolute inset-y-0 w-[150vw] -left-[25vw] flex items-stretch z-30"
      >
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-28 sm:w-44 md:w-56 text-[#451475] shrink-0 -mr-[1px]"
          >
            <path d="M100,0 C20,200 80,360 30,540 C-20,720 70,860 100,1000 Z" fill="currentColor" />
          </svg>

        <div className="flex-1 bg-gradient-to-r from-[#451475] via-[#351059] to-[#24133F] relative shadow-2xl" />

          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            className="h-full w-28 sm:w-44 md:w-56 text-[#24133F] shrink-0 -ml-[1px]"
          >
            <path d="M0,0 C80,200 20,360 70,540 C120,720 30,860 0,1000 Z" fill="currentColor" />
          </svg>

        {/* Viewport-Centered Hawi Sprinting Mascot & Copy */}
        <div
          className={`absolute left-[25vw] w-[100vw] inset-y-0 flex flex-col items-center justify-center text-center px-6 transition-all duration-300 z-10 ${
            phase === 'enter' && animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="relative mb-2">
            <img
              src={hawiSprintImg}
              alt="Hawi Sprinting"
              className={`h-32 w-auto sm:h-44 object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.5)] ${
                isLtr ? '' : 'scale-x-[-1]'
              }`}
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
            {isLtr ? 'Welcome to Super Admin' : 'Signed Out'}
          </h2>
          <p className="mt-1.5 text-sm font-medium text-white/80 drop-shadow-sm">
            {message || (isLtr ? 'Entering Dashboard…' : 'Returning to Login…')}
          </p>
        </div>
      </div>
    </div>
  );
};
