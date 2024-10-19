'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Cloud, Users, Clock } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function MayflyShowcase() {
  const features = [
    {
      icon: <Cloud className="h-6 w-6" />,
      text: 'Automated deployment of session backends',
    },
    {
      icon: <Users className="h-6 w-6" />,
      text: 'Developer dashboard for observing live user sessions',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      text: 'Automated infrastructure provisioning',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-4xl mx-auto">
        <div className="relative">
          <div className="absolute top-6 right-6 overflow-hidden">
            <Image
              src="/images/transparentMayflyLogoNoText.png"
              alt="Mayfly Logo"
              width={80}
              height={80}
              className="h-10 w-10 md:h-20 md:w-20"
            />
          </div>
          <CardHeader>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CardTitle className="text-3xl font-bold">Mayfly</CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <CardDescription className="text-xl">
                Host stateful apps as dedicated user sessions in the browser
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.p
              className="text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Mayfly is an open-source tool that revolutionizes the way
              developers host and manage stateful applications, providing
              dedicated user sessions directly in the browser.
            </motion.p>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                >
                  {feature.icon}
                  <span>{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
          <CardFooter>
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Button
                className="w-full"
                onClick={() => window.open('https://mayfly.dev/', '_blank')}
              >
                Explore Mayfly <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  );
}
