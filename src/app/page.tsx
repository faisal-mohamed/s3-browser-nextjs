'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './components/LoadingSpinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the login page
    router.push('/s3-browser-login');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-4">S3 Browser</h1>
        <p className="text-xl text-text-secondary mb-8">Loading application...</p>
        {/* <LoadingSpinner size="lg" className="mx-auto" /> */}
      </div>
    </main>
  );
}
