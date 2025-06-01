import './globals.css'
import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import AppInitializer from './components/AmplifyInitializer'

const lexend = Lexend({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export const metadata: Metadata = {
  title: 'S3 Browser',
  description: 'Browse and manage your S3 buckets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${lexend.variable} font-lexend`}>
        <AppInitializer>
          {children}
        </AppInitializer>
      </body>
    </html>
  )
}
