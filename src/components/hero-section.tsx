'use client'

import { useState, useEffect } from 'react'
// import Link from 'next/link';
// import { motion } from 'framer-motion';
// import { Button } from '@/components/ui/button';
import { Headshot } from '@/components/headshot'
import { CursiveName } from '@/components/cursive-name'
import { TypingEffect } from '@/components/typing-effect'

export function HeroSection() {
  const [cursiveNameFinished, setCursiveNameFinished] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setCursiveNameFinished(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="p-4 pb-0">
      <div className="flex flex-col items-center space-y-4 md:flex-row md:items-start md:space-x-6 md:space-y-0">
        <div className="flex-shrink-0">
          <Headshot
            lightModeBitSrc="/images/LightHeadshotBitGolden.jpg"
            lightModeLiveSrc="/images/LightHeadshotLiveGolden.jpg"
            darkModeBitSrc="/images/DarkHeadshotBitGolden.jpg"
            darkModeLiveSrc="/images/DarkHeadshotLiveGolden.jpg"
            alt="Joshua W Lindsay"
            size={200}
          />
        </div>
        <div className="max-w-[225px] flex-1">
          <CursiveName
            name="Joshua W Lindsay"
            className="mb-4 text-center text-4xl md:pl-3 md:text-left"
          />
          <div className="mb-4 rounded-lg bg-secondary/10 p-3 shadow-inner md:min-h-[170px] md:min-w-[500px]">
            {cursiveNameFinished && (
              <TypingEffect
                strings={[
                  'My Tech Stack...',
                  'JavaScript, TypeScript, Python, Go',
                  'Vue, Vuetify, React, Next.js, Node.js, Express',
                  'AWS Cert. Cloud Practitioner, Lambda, IoT Core',
                  'RDS, DynamoDB, S3, Athena, MySQL, Postgres',
                  'Docker, Ansible, Linux',
                ]}
                speed={50}
              />
            )}
          </div>
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center md:justify-start space-x-2">
              <Button asChild size="sm">
                <Link href="/projects">View Projects</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/blog">Read Blog</Link>
              </Button>
            </div>
          </motion.div> */}
        </div>
      </div>
    </section>
  )
}
