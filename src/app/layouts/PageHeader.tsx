'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/app/services/auth-service';

interface PageHeaderProps {
  headerName: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ headerName }) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      router.push('/s3-browser-login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="app-header">
      <div className="app-title">
        {headerName}
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={handleSignOut}
          className="btn btn-secondary text-sm"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default PageHeader;
