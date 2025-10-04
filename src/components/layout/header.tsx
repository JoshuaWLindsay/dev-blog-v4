'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span
              className="font-cursive inline-block font-bold"
              style={{ color: '#007ACC' }}
            >
              JWL
            </span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6">
          {/* <Link
            href="/projects"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Projects
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Blog
          </Link> */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
