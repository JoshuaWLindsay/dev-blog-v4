'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Headshot } from '@/components/headshot';
import { CursiveName } from '@/components/cursive-name';
import { TypingEffect } from '@/components/typing-effect';
import { Table, TableRow, TableCell, TableBody } from '@/components/ui/table';

export function HeroSection() {
  const [cursiveNameFinished, setCursiveNameFinished] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCursiveNameFinished(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="p-4 pb-0">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Headshot
                lightModeBitSrc="/images/LightHeadshotBitGolden.jpg"
                lightModeLiveSrc="/images/LightHeadshotLiveGolden.jpg"
                darkModeBitSrc="/images/DarkHeadshotBitGolden.jpg"
                darkModeLiveSrc="/images/DarkHeadshotLiveGolden.jpg"
                alt="Joshua W Lindsay"
                size={200}
              />
            </TableCell>
            <TableCell>
              <CursiveName name="Joshua W Lindsay" className="text-4xl mb-4" />
              <div
                className="mb-4 p-3 rounded-lg shadow-inner w-full bg-secondary/10"
                style={{
                  minHeight: '150px',
                  minWidth: '500px',
                }}
              >
                {cursiveNameFinished && (
                  <TypingEffect
                    strings={[
                      'My Tech Stack...',
                      'JavaScript, TypeScript, React, Next.js',
                      'Python, Streamlit',
                      'Postgres, MongoDB, S3',
                      'AWS Certified Cloud Practitioner',
                      'ChatGPT, Vercel V0',
                    ]}
                    speed={50}
                  />
                )}
              </div>
              <motion.div
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
              </motion.div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}
