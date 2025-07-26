'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function BioSection() {
  return (
    <Card className="w-full max-w-4xl mx-auto border-none shadow-none bg-transparent">
      <CardHeader>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle className="text-2xl font-bold">About Me</CardTitle>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CardDescription>
            Full-Stack Software Engineer & AWS Certified Cloud Practitioner
          </CardDescription>
        </motion.div>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          I am a <strong>former math teacher</strong> turned <strong>Full-Stack Software Engineer</strong> with a passion for building data-intensive UIs that leverage APIs and cloud services.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          From teaching math to at-risk students to parenting kids in foster care to
          supporting our customers' observability needs,{' '}
          <strong>I love solving problems with and for people</strong>.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          I co-created Mayfly, an open-source tool for hosting dedicated user
          sessions in the browser.
        </motion.p>
      </CardContent>
    </Card>
  );
}
