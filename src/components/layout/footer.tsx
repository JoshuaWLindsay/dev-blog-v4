'use client'

import Link from 'next/link'
import { Home, Linkedin, Github, FileText, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-muted py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="https://www.utexas.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 transition-all duration-300 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC]"
          >
            <Home className="h-5 w-5" />
            <span>Austin, TX</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="https://www.linkedin.com/in/joshuawlindsay"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 transition-all duration-300 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC]"
          >
            <Linkedin className="h-5 w-5" />
            <span>LinkedIn</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="https://github.com/JoshuaWLindsay"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 transition-all duration-300 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC]"
          >
            <Github className="h-5 w-5" />
            <span>GitHub</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="/images/Joshua-Lindsay-Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 transition-all duration-300 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC]"
          >
            <FileText className="h-5 w-5" />
            <span>Resume</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="mailto:joshwlindsay@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 transition-all duration-300 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC]"
          >
            <Mail className="h-5 w-5" />
            <span>joshwlindsay@gmail.com</span>
          </Link>
        </div>
        <div className="mt-8 border-t border-muted-foreground/20 pt-8 text-center">
          <Link
            href="https://open.spotify.com/album/64LU4c1nfjz1t4VnGhagcg"
            target="_blank"
            rel="noopener noreferrer"
            className="font-cursive items-center space-x-2 text-muted-foreground transition-all duration-300 hover:text-[#007ACC] hover:shadow-[0_0_10px_#007ACC]"
          >
            <span>JWL &apos;89</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
