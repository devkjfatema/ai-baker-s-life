import { useState } from 'react';
import { Croissant } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  eager = false,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F1EC] to-[#E6E2DA] text-[#6B655E] p-4 text-center ${className}`}
      >
        <Croissant className="w-8 h-8 mb-2 opacity-60" aria-hidden="true" />
        <span className="text-xs font-medium leading-snug max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
