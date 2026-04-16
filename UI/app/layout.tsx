import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const bricolage = Bricolage_Grotesque({ 
  subsets: ['latin'],
  variable: '--font-sans'
})

const jetbrains = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'ByteAI — Social Platform for Developers',
  description: 'Share insights, learn from peers, and level up your dev skills with the ByteAI developer community.',
}

export const viewport: Viewport = {
  themeColor: '#05050e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark h-full">
        <head>
          {/* Restore saved theme before first paint to avoid flash */}
          <script dangerouslySetInnerHTML={{ __html: `
            try {
              var t = localStorage.getItem('byteai_theme');
              if (t && t !== 'dark') document.documentElement.classList.add('theme-' + t);
              if (t === 'light') document.documentElement.classList.remove('dark');
            } catch(e) {}
          `}} />
        </head>
        <body className={`${bricolage.variable} ${jetbrains.variable} font-sans antialiased h-full w-full`}>
          {children}
</body>
      </html>
    </ClerkProvider>
  )
}
