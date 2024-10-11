'use client';

import Link from 'next/link';
import { Home, Linkedin, Github, FileText, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-muted py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="https://www.utexas.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC] transition-all duration-300"
          >
            <Home className="w-5 h-5" />
            <span>Austin, TX</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="https://www.linkedin.com/in/joshuawlindsay"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC] transition-all duration-300"
          >
            <Linkedin className="w-5 h-5" />
            <span>LinkedIn</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="https://github.com/JoshuaWLindsay"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC] transition-all duration-300"
          >
            <Github className="w-5 h-5" />
            <span>GitHub</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="/images/Joshua-Lindsay-Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC] transition-all duration-300"
          >
            <FileText className="w-5 h-5" />
            <span>Resume</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="mailto:joshwlindsay@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC] transition-all duration-300"
          >
            <Mail className="w-5 h-5" />
            <span>joshwlindsay@gmail.com</span>
          </Link>
        </div>
        <div className="mt-8 pt-8 border-t border-muted-foreground/20 text-center">
          <Link
            href="https://open.spotify.com/album/64LU4c1nfjz1t4VnGhagcg"
            target="_blank"
            rel="noopener noreferrer"
            className="font-cursive text-muted-foreground items-center space-x-2 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC] transition-all duration-300"
          >
            <span>JWL &apos;89</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
