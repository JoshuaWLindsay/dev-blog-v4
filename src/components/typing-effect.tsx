'use client';

import React from 'react';
import TypeIt from 'typeit-react';

interface TypingEffectProps {
  strings: string[];
  speed?: number;
  waitUntilVisible?: boolean;
}

export function TypingEffect({
  strings,
  speed = 50,
  waitUntilVisible = false,
}: TypingEffectProps) {
  return (
    <div className="font-mono">
      <TypeIt
        options={{
          strings: strings,
          speed: speed,
          loop: false,
          waitUntilVisible: waitUntilVisible,
          afterStep: (instance) => {
            const text = instance.getQueue().getItems()[0]?.content || '';
            const lines = text.split('\n');
            if (lines.length > 1) {
              instance.getElement().innerHTML = lines.join('<br>');
            }
          },
        }}
      />
    </div>
  );
}
