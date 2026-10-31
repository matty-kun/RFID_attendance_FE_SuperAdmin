import React from 'react';
import hawiQuestion from '../../assets/illustrations/Hawi Question.png';
import hawiBox from '../../assets/illustrations/Hawi Box.png';
import hawiCard from '../../assets/illustrations/Hawi Card.png';
import hawiBrokenCard from '../../assets/illustrations/Hawi Broken Card.png';
import hawiCrying from '../../assets/illustrations/Hawi Crying.png';
import { Button } from './Button';

export type EmptyStateVariant =
  | 'no-search-results'
  | 'empty-cards'
  | 'damaged-cards'
  | 'empty-list'
  | 'error'
  | 'custom';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  illustration?: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

const variantDefaults: Record<EmptyStateVariant, { image: string; title: string; description: string }> = {
  'no-search-results': {
    image: hawiQuestion,
    title: 'No results found',
    description: 'Try adjusting your search terms or clearing active filters.',
  },
  'empty-cards': {
    image: hawiCard,
    title: 'No RFID cards registered yet',
    description: 'Add physical cards to your inventory so they can be issued to students.',
  },
  'damaged-cards': {
    image: hawiBrokenCard,
    title: 'No damaged or lost cards',
    description: 'Cards reported as damaged or lost will show up here for review.',
  },
  'empty-list': {
    image: hawiBox,
    title: 'Nothing here yet',
    description: 'New records and activity will appear here automatically.',
  },
  'error': {
    image: hawiCrying,
    title: 'Unable to load data',
    description: 'Something went wrong while connecting. Please try again.',
  },
  'custom': {
    image: hawiQuestion,
    title: 'No items found',
    description: '',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'no-search-results',
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) => {
  const defaults = variantDefaults[variant] || variantDefaults['no-search-results'];
  const imageSrc = illustration || defaults.image;
  const displayTitle = title ?? defaults.title;
  const displayDesc = description ?? defaults.description;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-14 px-6'} ${className}`}>
      <img
        src={imageSrc}
        alt=""
        className={`${compact ? 'h-20 w-20' : 'h-28 w-28'} object-contain mb-3 select-none`}
        loading="lazy"
      />
      <h3 className="text-sm font-bold text-[#24133F]">{displayTitle}</h3>
      {displayDesc ? (
        <p className="mt-1 max-w-sm text-xs text-[#756883] leading-relaxed">
          {displayDesc}
        </p>
      ) : null}

      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {secondaryAction && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              type="button"
              variant={action.variant || 'primary'}
              size="sm"
              leftIcon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
