'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CursiveNameProps {
  name: string;
  className?: string;
}

export function CursiveName({ name, className = '' }: CursiveNameProps) {
  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.04 * i },
    }),
  };

  return (
    <motion.span
      className={`font-cursive inline-block ${className}`}
      style={{ color: '#007ACC' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {name.split('').map((letter, index) => (
        <motion.span
          key={index}
          variants={letterVariants}
          transition={{
            type: 'spring',
            damping: 12,
            stiffness: 200,
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default function CursiveNameWithStyles() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Brush+Script+MT&display=swap');

        .font-cursive {
          font-family: 'Brush Script MT', cursive;
          font-size: 2rem;
        }
      `}</style>
      <CursiveName name="Your Name" />
    </>
  );
}
