import React from 'react';
import { Loader2 } from 'lucide-react';
import hawiFindingImg from '../../assets/illustrations/Hawi Finding.png';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading…',
  description,
  className = '',
  compact = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'min-h-40 py-8 px-4' : 'min-h-64 py-14 px-6'
      } ${className}`}
    >
      <img
        src={hawiFindingImg}
        alt=""
        className={`${compact ? 'h-20 w-20' : 'h-28 w-28'} object-contain mb-3 select-none motion-safe:animate-bounce`}
      />
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#7026B7]" />
        <p className="text-sm font-bold text-[#24133F]">{title}</p>
      </div>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-[#756883] leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
};

export default LoadingState;
