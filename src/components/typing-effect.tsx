'use client'

import React from 'react'
import TypeIt from 'typeit-react'

interface TypingEffectProps {
  strings: string[]
  speed?: number
  waitUntilVisible?: boolean
}

interface TypeItInstance {
  getQueue: () => {
    getItems: () => Array<{ content: string }>
  }
  getElement: () => HTMLElement
}

export function TypingEffect({ strings, speed = 50 }: TypingEffectProps) {
  return (
    <div className="font-mono">
      <TypeIt
        options={{
          strings: strings,
          speed: speed,
          afterStep: (instance: TypeItInstance) => {
            const text = instance.getQueue().getItems()[0]?.content || ''
            const lines = text.split('\n')
            if (lines.length > 1) {
              instance.getElement().innerHTML = lines.join('<br>')
            }
          },
        }}
      />
    </div>
  )
}
