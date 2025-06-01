'use client';

declare global {
  interface XMLHttpRequest {
    _s3Url?: string;
    _s3Method?: string;
  }
}

import { useEffect, useState, useRef } from 'react';
import '@aws-amplify/ui-react-storage/styles.css';
import { Hub } from 'aws-amplify/utils';
import { createManagedAuthAdapter, createStorageBrowser } from '@aws-amplify/ui-react-storage/browser';
import authService from '@/app/services/auth-service';
import PageHeader from '@/app/layouts/PageHeader';
import { useEnvVars } from '../hooks/useEnvVars';
import { useAppInitialized } from '../context/AppInitContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';

const createAuthAdapter = async (envVars: any) => {
  const region = envVars.VITE_AWS_REGION;
  const accountId = envVars.VITE_S3_BROWSER_ACCOUNT_ID;

  if (!region || !accountId) {
    throw new Error('Missing required environment variables for S3 Browser');
  }

  return createManagedAuthAdapter({
    credentialsProvider: async () => {
      try {
        const awsCredentials = authService.getAWSCredentialsFromSession();
        return {
          credentials: {
            accessKeyId: awsCredentials.accessKeyId,
            secretAccessKey: awsCredentials.secretAccessKey,
            sessionToken: awsCredentials.sessionToken,
            expiration: awsCredentials.expiration, // Date object
          },
        };
      } catch (error) {
        console.error('Failed to get AWS credentials:', error);
        throw error;
      }
    },
    region,
    accountId,
    registerAuthListener: (onAuthStateChange) => {
      const listener = Hub.listen('auth', (data) => {
        const { payload }: any = data;
        if (payload.event === 'signOut' || payload.event === 'tokenRefresh') {
          onAuthStateChange();
        }
      });

      return () => {
        if (typeof listener === 'function') {
          listener();
        }
      };
    },
  });
};

const extractKeyFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    let key = urlObj.pathname;

    const hostname = urlObj.hostname;
    if (hostname.includes('s3') || hostname.includes('amazonaws.com')) {
      key = `${hostname}${key}`;
    }

    if (urlObj.search && urlObj.search.includes('X-Amz-Credential')) {
      key += urlObj.search;
    }

    return key;
  } catch (e) {
    return url;
  }
};

const DUPLICATE_REQUEST_WINDOW_MS = 2000;

const NetworkInterceptor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const downloadUrls = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      const method = args[0] instanceof Request ? args[0].method : 'GET';

      if (
        /s3[.-]([a-z0-9-]+\.)?amazonaws\.com|\.s3\./.test(url) &&
        method === 'HEAD' &&
        !url.includes('partNumber=')
      ) {
        const now = Date.now();
        const key = extractKeyFromUrl(url);

        if (key && downloadUrls.current.has(key)) {
          const lastDownload = downloadUrls.current.get(key) || 0;
          if (now - lastDownload < DUPLICATE_REQUEST_WINDOW_MS) {
            console.warn(`🚫 Blocking duplicate S3 HEAD request for: ${key}`);
            return Promise.reject(new Error('Duplicate HEAD blocked'));
          }
        }

        if (key) {
          downloadUrls.current.set(key, now);
          setTimeout(() => downloadUrls.current.delete(key), 10000);
        }
      }

      return originalFetch.apply(window, args);
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username: string | null = null,
      password: string | null = null
    ): void {
      (this as any)._s3Url = typeof url === 'string' ? url : url.toString();
      (this as any)._s3Method = method.toUpperCase();
      return originalXhrOpen.call(this, method, url, async, username ?? undefined, password ?? undefined);
    };

    XMLHttpRequest.prototype.send = function (...args: any) {
      const url = this._s3Url;
      const method = (this as any)._s3Method || 'GET';

      if (
        url &&
        /s3[.-]([a-z0-9-]+\.)?amazonaws\.com|\.s3\./.test(url) &&
        method === 'HEAD' &&
        !url.includes('partNumber=')
      ) {
        const now = Date.now();
        const key = extractKeyFromUrl(url);

        if (key && downloadUrls.current.has(key)) {
          const lastDownload = downloadUrls.current.get(key) || 0;
          if (now - lastDownload < DUPLICATE_REQUEST_WINDOW_MS) {
            setTimeout(() => this.abort(), 0);
            return;
          }
        }

        if (key) {
          downloadUrls.current.set(key, now);
          setTimeout(() => downloadUrls.current.delete(key), 10000);
        }
      }

      return originalXhrSend.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXhrOpen;
      XMLHttpRequest.prototype.send = originalXhrSend;
    };
  }, []);

  return <>{children}</>;
};

const S3BrowserWithAdapter = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [StorageBrowserComponent, setStorageBrowserComponent] = useState<React.ComponentType | null>(null);
  const router = useRouter();
  const sessionChecked = useRef(false);

  const { envVars, isLoading: isEnvLoading, isError: isEnvError } = useEnvVars();
  const { isReady } = useAppInitialized();

  const checkSession = async () => {
    try {
      // First check if we have valid AWS credentials in session storage
      if (authService.hasValidStoredCredentials()) {
        //console.log('✅ Valid AWS credentials found in session storage');
        return true;
      }
      
      // Otherwise check with Cognito
      const isAuthenticated = await authService.isCognitoAuthenticated();
      if (!isAuthenticated) {
        //console.log('⚠️ User not authenticated, redirecting to login');
        await authService.signOut();
        router.push('/s3-browser-login');
        return false;
      }
      
      return true;
    } catch (err: any) {
      console.error('Error during session check:', err);
      setError('Session check failed: ' + err.message);
      // Don't redirect immediately on error to avoid redirect loops
      setTimeout(() => {
        router.push('/s3-browser-login');
      }, 2000);
      return false;
    }
  };

  useEffect(() => {
    // Check session immediately
    if (!sessionChecked.current) {
      sessionChecked.current = true;
      checkSession();
    }
    
    // Then periodically
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    async function initStorage() {
      if (!isReady || isEnvLoading || !envVars) {
        return; // Wait until everything is ready
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if user is authenticated before proceeding
        const isAuthenticated = await checkSession();
        if (!isAuthenticated) {
          return; // Don't proceed if not authenticated
        }
        
        const authAdapter: any = await createAuthAdapter(envVars);
        const { StorageBrowser } = createStorageBrowser({ config: authAdapter });
        setStorageBrowserComponent(() => StorageBrowser);
      } catch (error: any) {
        console.error('Failed to initialize StorageBrowser:', error);
        setError(error.message || 'StorageBrowser initialization failed');
        
        // If there's an authentication error, redirect to login
        if (error.message.includes('authenticated') || 
            error.message.includes('credentials') ||
            error.message.includes('token')) {
          setTimeout(() => {
            router.push('/s3-browser-login');
          }, 2000);
        }
      } finally {
        setIsLoading(false);
      }
    }

    initStorage();
  }, [envVars, isEnvLoading, isReady, router]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-text-secondary">Initializing...</p>
        </div>
      </div>
    );
  }

  if (isEnvLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-text-secondary">Loading environment variables...</p>
        </div>
      </div>
    );
  }

  if (isEnvError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-medium text-text-primary mb-2">Configuration Error</h2>
          <p className="text-text-secondary mb-6">Failed to load environment configuration</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-text-secondary">Loading S3 Browser...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="card p-8 max-w-md w-full">
          <div className="text-red-500 text-4xl text-center mb-4">⚠️</div>
          <h2 className="text-xl font-medium text-text-primary mb-2">Error</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/s3-browser-login')}
              className="btn btn-primary"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!StorageBrowserComponent) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-text-secondary">Initializing StorageBrowser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="s3-browser-container fade-in">
      <PageHeader headerName="S3 Browser" />
      <div className="s3-browser-content mt-4">
        <NetworkInterceptor>
          <StorageBrowserComponent />
        </NetworkInterceptor>
      </div>
    </div>
  );
};

export default S3BrowserWithAdapter;
