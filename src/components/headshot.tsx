'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

interface HeadshotProps {
  lightModeLiveSrc: string;
  lightModeBitSrc: string;
  darkModeLiveSrc: string;
  darkModeBitSrc: string;
  alt: string;
  size?: number | string;
  animation?: {
    initial?: object;
    animate?: object;
    transition?: object;
  };
  toggleable?: boolean;
}

export function Headshot({
  lightModeLiveSrc,
  lightModeBitSrc,
  darkModeLiveSrc,
  darkModeBitSrc,
  alt,
  size = '100%',
  animation = {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.8, delay: 0.5, ease: [0, 0.71, 0.2, 1.01] },
  },
  toggleable = true,
}: HeadshotProps) {
  const { theme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isPrimaryImage, setIsPrimaryImage] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Ensure component is mounted to avoid hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine if dark mode is active
  const isDarkMode =
    isMounted && (theme === 'dark' || resolvedTheme === 'dark');

  // Toggle between primary and secondary images
  const toggleImage = () => {
    if (toggleable) {
      setIsPrimaryImage((prev) => !prev);
    }
  };

  // Determine the appropriate image source based on theme and toggle state
  const imageSrc = isDarkMode
    ? isPrimaryImage
      ? darkModeLiveSrc
      : darkModeBitSrc
    : isPrimaryImage
    ? lightModeLiveSrc
    : lightModeBitSrc;

  // Handle keyboard interactions for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (toggleable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleImage();
    }
  };

  return (
    <motion.div
      initial={animation.initial}
      animate={animation.animate}
      transition={animation.transition}
    >
      <div
        className={`relative overflow-hidden border-primary shadow-lg ${
          toggleable ? 'cursor-pointer' : ''
        }`}
        onClick={toggleImage}
        onKeyDown={handleKeyDown}
        tabIndex={toggleable ? 0 : -1}
        role={toggleable ? 'button' : undefined}
        aria-label={toggleable ? 'Toggle headshot style' : undefined}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          aspectRatio: '1 / 1.618',
        }}
      >
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-red-200 dark:bg-red-800"
            >
              Error loading image
            </motion.div>
          )}
          {!hasError && isMounted && (
            <Image
              key={imageSrc}
              src={imageSrc}
              alt={alt}
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-lg"
              priority
              onError={() => setHasError(true)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
