// 'use client';

// declare global {
//   interface XMLHttpRequest {
//     _s3Url?: string;
//     _s3Method?: string;
//   }
// }


// import { useEffect, useState, useRef } from 'react';
// import '@aws-amplify/ui-react-storage/styles.css';
// import { Hub } from 'aws-amplify/utils';
// import { createManagedAuthAdapter, createStorageBrowser } from '@aws-amplify/ui-react-storage/browser';
// import authService from '@/app/services/auth-service';
// import PageHeader from '@/app/layouts/PageHeader';
// import { getEnvVar } from '@/app/utilities/common'; // ✅ must be a client-compatible getter
// import { useAppInitialized } from '../context/AppInitContext';
// import { useEnvVars } from '../hooks/useEnvVars';

// const createAuthAdapter = async (envVars : any) => {
     
//   const region = envVars.VITE_AWS_REGION;
//   const accountId = envVars.VITE_S3_BROWSER_ACCOUNT_ID;

//   if (!region || !accountId) {
//     throw new Error('Missing required environment variables for S3 Browser');
//   }

//   return createManagedAuthAdapter({
//     credentialsProvider: async (_options = { forceRefresh: false }) => {
//       const credentials: any = await authService.getSSOCredentials();
//       return {
//         credentials: {
//           accessKeyId: credentials?.accessKeyId,
//           secretAccessKey: credentials?.secretAccessKey,
//           sessionToken: credentials?.sessionToken,
//           expiration: credentials?.expiration,
//         },
//       };
//     },
//     region,
//     accountId,
//     registerAuthListener: (onAuthStateChange) => {
//       const listener = Hub.listen('auth', (data) => {
//         const { payload }: any = data;
//         if (payload.event === 'signOut' || payload.event === 'tokenRefresh') {
//           onAuthStateChange();
//         }
//       });

//       return () => {
//         if (typeof listener === 'function') {
//           listener();
//         }
//       };
//     },
//   });
// };

// const extractKeyFromUrl = (url: string): string | null => {
//   try {
//     const urlObj = new URL(url);
//     let key = urlObj.pathname;

//     const hostname = urlObj.hostname;
//     if (hostname.includes('s3') || hostname.includes('amazonaws.com')) {
//       key = `${hostname}${key}`;
//     }

//     if (urlObj.search && urlObj.search.includes('X-Amz-Credential')) {
//       key += urlObj.search;
//     }

//     return key;
//   } catch (e) {
//     return url;
//   }
// };

// const DUPLICATE_REQUEST_WINDOW_MS = 2000;

// const NetworkInterceptor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const downloadUrls = useRef<Map<string, number>>(new Map());

//   useEffect(() => {
//     const originalFetch = window.fetch;
//     window.fetch = async function (...args) {
//       const url = args[0] instanceof Request ? args[0].url : String(args[0]);
//       const method = args[0] instanceof Request ? args[0].method : 'GET';

//       if (
//         /s3[.-]([a-z0-9-]+\.)?amazonaws\.com|\.s3\./.test(url) &&
//         method === 'HEAD' &&
//         !url.includes('partNumber=')
//       ) {
//         const now = Date.now();
//         const key = extractKeyFromUrl(url);

//         if (key && downloadUrls.current.has(key)) {
//           const lastDownload = downloadUrls.current.get(key) || 0;
//           if (now - lastDownload < DUPLICATE_REQUEST_WINDOW_MS) {
//             console.warn(`🚫 Blocking duplicate S3 HEAD request for: ${key}`);
//             return Promise.reject(new Error('Duplicate HEAD blocked'));
//           }
//         }

//         if (key) {
//           downloadUrls.current.set(key, now);
//           setTimeout(() => downloadUrls.current.delete(key), 10000);
//         }
//       }

//       return originalFetch.apply(window, args);
//     };

//     const originalXhrOpen = XMLHttpRequest.prototype.open;
//     const originalXhrSend = XMLHttpRequest.prototype.send;

//    XMLHttpRequest.prototype.open = function (
//   method: string,
//   url: string | URL,
//   async: boolean = true,
//   username: string | null = null,
//   password: string | null = null
// ): void {
//   (this as any)._s3Url = typeof url === 'string' ? url : url.toString();
//   (this as any)._s3Method = method.toUpperCase();
//   return originalXhrOpen.call(this, method, url, async, username ?? undefined, password ?? undefined);
// };


//     XMLHttpRequest.prototype.send = function (...args: any) {
//       const url = this._s3Url;
//       const method = (this as any)._s3Method || 'GET';

//       if (
//         url &&
//         /s3[.-]([a-z0-9-]+\.)?amazonaws\.com|\.s3\./.test(url) &&
//         method === 'HEAD' &&
//         !url.includes('partNumber=')
//       ) {
//         const now = Date.now();
//         const key = extractKeyFromUrl(url);

//         if (key && downloadUrls.current.has(key)) {
//           const lastDownload = downloadUrls.current.get(key) || 0;
//           if (now - lastDownload < DUPLICATE_REQUEST_WINDOW_MS) {
//             setTimeout(() => this.abort(), 0);
//             return;
//           }
//         }

//         if (key) {
//           downloadUrls.current.set(key, now);
//           setTimeout(() => downloadUrls.current.delete(key), 10000);
//         }
//       }

//       return originalXhrSend.apply(this, args);
//     };

//     return () => {
//       window.fetch = originalFetch;
//       XMLHttpRequest.prototype.open = originalXhrOpen;
//       XMLHttpRequest.prototype.send = originalXhrSend;
//     };
//   }, []);

//   return <>{children}</>;
// };

// const S3BrowserWithAdapter = () => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [credentials, setCredentials] = useState<any>(null);
//   const [StorageBrowserComponent, setStorageBrowserComponent] = useState<React.ComponentType | null>(null);

//     const { envVars, isLoading : isEnvLoading, isError } = useEnvVars();
  


  
//   const getCredentials = async () => {
//     try {
//       const creds = await authService.getSSOCredentials();
//       setCredentials(creds);
//     } catch (err: any) {
//       setError(err.message || 'Failed to get credentials');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     getCredentials();

//     const unsubscribe = Hub.listen('auth', ({ payload }: any) => {
//       if (payload.event === 'signIn') {
//         authService.clearCache();
//         getCredentials();
//       }

//       if (payload.event === 'signOut') {
//         authService.clearCache();
//         setCredentials(null);
//       }
//     });

//     return () => {
//       if (typeof unsubscribe === 'function') {
//         unsubscribe();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     async function initStorage() {
//       try {
//         const authAdapter : any = await createAuthAdapter(envVars);
//         const { StorageBrowser } = createStorageBrowser({ config: authAdapter });
//         setStorageBrowserComponent(() => StorageBrowser);
//       } catch (error: any) {
//         console.error('Failed to initialize StorageBrowser:', error);
//         setError(error.message || 'StorageBrowser initialization failed');
//       }
//     }

//     initStorage();
//   }, []);

//   useEffect(() => {
//     const interval = setInterval(async () => {
//       const isValid = authService.checkCredentialsValidity();
//       console.log('isValid: ', isValid);
//       if (!isValid) {
//         await authService.signOut();
//         authService.clearCache();
//       }
//     }, 60 * 1000);

//     return () => clearInterval(interval);
//   }, []);


//    const { isReady } = useAppInitialized();

//   if (!isReady) {
//     return <div>Initializing Cognito...</div>;
//   }

//   if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;
//   if (error) return <div className="text-sm text-red-500">Error: {error}</div>;
//   if (!credentials)
//     return <div className="text-sm text-yellow-600">Please sign in to access the S3 uploader.</div>;

//   if (!StorageBrowserComponent)
//     return <div className="text-sm text-gray-500">Initializing StorageBrowser...</div>;

//   return (
//     <div className="s3-browser-container p-4 rounded shadow-md bg-white">
//       <PageHeader headerName="S3 Browser" />
//       <div className="page-content">
//         <NetworkInterceptor>
//           <StorageBrowserComponent />
//         </NetworkInterceptor>
//       </div>
//     </div>
//   );
// };

// export default S3BrowserWithAdapter;


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

import { fetchAuthSession } from 'aws-amplify/auth';

const createAuthAdapter = async (envVars: any) => {
  const region = envVars.VITE_AWS_REGION;
  const accountId = envVars.VITE_S3_BROWSER_ACCOUNT_ID;

  if (!region || !accountId) {
    throw new Error('Missing required environment variables for S3 Browser');
  }

  return createManagedAuthAdapter({
    credentialsProvider: async () => {
  const awsCredentials = authService.getAWSCredentialsFromSession();


  return {
    credentials: {
      accessKeyId: awsCredentials.accessKeyId,
      secretAccessKey: awsCredentials.secretAccessKey,
      sessionToken: awsCredentials.sessionToken,
      expiration: awsCredentials.expiration, // Date object
    },
  };
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

  const { envVars } = useEnvVars();
  const { isReady } = useAppInitialized();

  const checkSession = async () => {
    try {
      const isAuthenticated = await authService.isCognitoAuthenticated();
      if (!isAuthenticated) {
        await authService.signOut();
      }
    } catch (err: any) {
      console.error('Error during session check:', err);
      await authService.signOut();
    }
  };

  useEffect(() => {
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function initStorage() {
      try {
        const authAdapter: any = await createAuthAdapter(envVars);
        const { StorageBrowser } = createStorageBrowser({ config: authAdapter });
        setStorageBrowserComponent(() => StorageBrowser);
      } catch (error: any) {
        console.error('Failed to initialize StorageBrowser:', error);
        setError(error.message || 'StorageBrowser initialization failed');
      } finally {
        setIsLoading(false);
      }
    }

    initStorage();
  }, [envVars]);

  if (!isReady) {
    return <div>Initializing Cognito...</div>;
  }

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;

  if (!StorageBrowserComponent)
    return <div className="text-sm text-gray-500">Initializing StorageBrowser...</div>;

  return (
    <div className="s3-browser-container p-4 rounded shadow-md bg-white">
      <PageHeader headerName="S3 Browser" />
      <div className="page-content">
        <NetworkInterceptor>
          <StorageBrowserComponent />
        </NetworkInterceptor>
      </div>
    </div>
  );
};

export default S3BrowserWithAdapter;
