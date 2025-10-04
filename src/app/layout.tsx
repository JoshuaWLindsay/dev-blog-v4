import '@/app/globals.css'
import localFont from 'next/font/local'
import { ThemeProvider } from '@/components/theme-provider'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Providers } from './providers'

const inter = localFont({
  src: [
    {
      path: '../../public/fonts/inter/InterVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/inter/InterVariable-Italic.woff2',
      weight: '100 900',
      style: 'italic',
    },
  ],
  display: 'swap',
})

export const metadata = {
  title: 'Joshua Lindsay - Developer Portfolio',
  description: 'Full-stack developer specializing in React and Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-grow overflow-auto">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
