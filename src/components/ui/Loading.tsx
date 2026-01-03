import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <svg
      className={cn('animate-spin text-primary', sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

Spinner.displayName = 'Spinner';

export interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Loading: React.FC<LoadingProps> = ({ text = 'Loading...', fullScreen = false, size = 'lg' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Spinner size={size} />
      {text && <p className="text-neutral-medium text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90 z-50">
        {content}
      </div>
    );
  }

  return content;
};

Loading.displayName = 'Loading';

export { Spinner, Loading };
