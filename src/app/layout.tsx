import './globals.css';

import AppInitializer from './components/AmplifyInitializer';

export const metadata = {
  title: 'S3 Browser',
  description: 'Next.js 15 AWS S3 browser app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
          <AppInitializer>{children}</AppInitializer>
      </body>
    </html>
  );
}
