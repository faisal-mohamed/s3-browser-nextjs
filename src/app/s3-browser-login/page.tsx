// 'use client';

// import React, { useEffect, useState, useRef } from 'react';
// import { useRouter } from 'next/navigation';
// import { Hub } from 'aws-amplify/utils';
// import authService from '@/app/services/auth-service';
// import AuthenticatorWrapper from '@/app/components/AuthenticatorWrapper';
// import { useTokenExchange } from '@/app/hooks/useTokenExchange';
// import { useAppInitialized } from '../context/AppInitContext';
// import LoadingSpinner from '../components/LoadingSpinner';

// export default function CognitoLogin() {
//   const { exchangeToken, loading, error } = useTokenExchange();
//   const router = useRouter();
//   const [fallbackActive, setFallbackActive] = useState(false);
//   const isProcessingAuth = useRef<boolean>(false);
//   const { isReady } = useAppInitialized();
//   const authEventHandled = useRef<boolean>(false);
//   const [redirecting, setRedirecting] = useState(false);

//   // Function to handle redirection with logging
//   const redirectToS3Browser = () => {
//     console.log('🚀 Redirecting to S3 browser page');
//     setRedirecting(true);
    
//     // Use a small timeout to ensure state updates complete
//     setTimeout(() => {
//       router.push('/s3-browser');
//     }, 100);
//   };

//   useEffect(() => {
//     let unsubscribe: (() => void) | undefined;

//     const initAuthFlow = async () => {
//       try {
//         // Check if user already has valid credentials
//         if (authService.hasValidStoredCredentials()) {
//           console.log('✅ User has valid stored credentials, redirecting to S3 browser');
//           redirectToS3Browser();
//           return;
//         }

//         // Check if user is already authenticated with Cognito
//         const isAuthenticated = await authService.isCognitoAuthenticated();

//         if (isAuthenticated) {
//           console.log('✅ User already authenticated, proceeding to exchange token');
          
//           // Prevent duplicate processing
//           if (isProcessingAuth.current) {
//             console.log('⚠️ Already processing auth, skipping');
//             return;
//           }
          
//           isProcessingAuth.current = true;
          
//           try {
//             const session = await authService.getSession();
//             console.log("Session obtained:", session ? "success" : "failed");
            
//             await exchangeToken({ jwtToken: session.idToken });
//             console.log('✅ Token exchange successful, redirecting to S3 browser');
//             redirectToS3Browser();
//           } catch (err) {
//             console.error('🔥 Error during token exchange or session fetch:', err);
//           } finally {
//             isProcessingAuth.current = false;
//           }
//           return;
//         }

//         console.log('👂 Listening for Cognito Hub auth events');

//         unsubscribe = Hub.listen('auth', async ({ payload }: any) => {
//           console.log('🔁 Auth event received:', payload.event);

//           if (payload.event === 'signedIn') {
//             // Prevent duplicate processing of the same auth event
//             if (isProcessingAuth.current || authEventHandled.current) {
//               console.log('⚠️ Auth event already handled, skipping');
//               return;
//             }
            
//             isProcessingAuth.current = true;
//             authEventHandled.current = true;
            
//             try {
//               const session = await authService.getSession();
//               console.log('✅ Signed in, exchanging token');
//               console.log("Session data:", session ? "available" : "missing");

//               await exchangeToken({ jwtToken: session.idToken });
//               console.log('✅ Token exchange successful, redirecting to S3 browser');
//               redirectToS3Browser();
//             } catch (err) {
//               console.error('🔥 Error during token exchange or session fetch:', err);
//               authEventHandled.current = false; // Reset flag to allow retry
//               await authService.signOut();
//             } finally {
//               isProcessingAuth.current = false;
//             }
//           }

//           if (payload.event === 'signedOut') {
//             console.log('🔓 Signed out, clearing local state');
//             authEventHandled.current = false;
//           }
//         });
//       } catch (error) {
//         console.error('❌ Error during initial auth check:', error);
//         await authService.signOut();
//         isProcessingAuth.current = false;
//       }
//     };

//     if (isReady) {
//       initAuthFlow();
//     }

//     return () => {
//       if (typeof unsubscribe === 'function') {
//         unsubscribe();
//       }
//     };
//   }, [router, exchangeToken, isReady]);

//   if (!isReady) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-background">
//         <div className="text-center">
//           <LoadingSpinner size="lg" />
//           <p className="mt-4 text-text-secondary">Initializing...</p>
//         </div>
//       </div>
//     );
//   }

//   if (redirecting) {
//     return (
//       <div className="flex h-screen flex-col items-center justify-center bg-background fade-in">
//         <LoadingSpinner size="lg" />
//         <p className="mt-6 text-lg font-medium text-text-secondary">Redirecting to S3 Browser...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 fade-in">
//       <div className="max-w-md mx-auto">
//         <div className="text-center mb-10">
//           <h2 className="text-3xl font-semibold text-text-primary tracking-tight">
//             S3 Browser
//           </h2>
//           <p className="mt-2 text-text-secondary">
//             Sign in to access your S3 buckets
//           </p>
//         </div>
        
//         <div className="card p-8 slide-up">
//           {!fallbackActive && (
//             <div className="text-center mb-6">
//               <h3 className="text-xl font-medium text-text-primary">
//                 Sign In
//               </h3>
//               <p className="mt-2 text-sm text-text-secondary">
//                 Use your credentials to access the S3 Browser
//               </p>
//             </div>
//           )}
          
//           <AuthenticatorWrapper>
//             {(authProps) => {
//               // Use a safe way to update state without hooks
//               if (!fallbackActive) {
//                 requestAnimationFrame(() => {
//                   setFallbackActive(true);
//                 });
//               }
              
//               return (
//                 <div className="text-center py-4">
//                   <LoadingSpinner className="mx-auto" />
//                   <p className="mt-4 text-text-secondary">Authenticating...</p>
//                 </div>
//               );
//             }}
//           </AuthenticatorWrapper>
          
//           {loading && (
//             <div className="mt-4 p-3 bg-primary-light text-primary rounded-md text-center">
//               <p>Exchanging token...</p>
//             </div>
//           )}
          
//           {error && (
//             <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
//               <p className="font-medium">Authentication Error</p>
//               <p className="text-sm mt-1">{error.message || 'Token exchange failed'}</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


  'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import authService from '@/app/services/auth-service';
import AuthenticatorWrapper from '@/app/components/AuthenticatorWrapper';
import { useTokenExchange } from '@/app/hooks/useTokenExchange';
import { useAppInitialized } from '../context/AppInitContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './styles.scss';

export default function CognitoLogin() {
  const { exchangeToken, loading, error } = useTokenExchange();
  const router = useRouter();
  const [fallbackActive, setFallbackActive] = useState(false);
  const isProcessingAuth = useRef(false);
  const { isReady } = useAppInitialized();
  const authEventHandled = useRef(false);
  const [redirecting, setRedirecting] = useState(false);

  const redirectToS3Browser = () => {
    setRedirecting(true);
    setTimeout(() => {
      router.push('/s3-browser');
    }, 100);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuthFlow = async () => {
      try {
        if (authService.hasValidStoredCredentials()) {
          redirectToS3Browser();
          return;
        }

        const isAuthenticated = await authService.isCognitoAuthenticated();

        if (isAuthenticated) {
          if (isProcessingAuth.current) return;

          isProcessingAuth.current = true;

          try {
            const session = await authService.getSession();
            await exchangeToken({ jwtToken: session.idToken });
            redirectToS3Browser();
          } catch (err) {
            console.error('Error during token exchange or session fetch:', err);
          } finally {
            isProcessingAuth.current = false;
          }
          return;
        }

        unsubscribe = Hub.listen('auth', async ({ payload }: any) => {
          if (payload.event === 'signedIn') {
            if (isProcessingAuth.current || authEventHandled.current) return;

            isProcessingAuth.current = true;
            authEventHandled.current = true;

            try {
              const session = await authService.getSession();
              await exchangeToken({ jwtToken: session.idToken });
              redirectToS3Browser();
            } catch (err) {
              console.error('Error during token exchange or session fetch:', err);
              authEventHandled.current = false;
              await authService.signOut();
            } finally {
              isProcessingAuth.current = false;
            }
          }

          if (payload.event === 'signedOut') {
            authEventHandled.current = false;
          }
        });
      } catch (error) {
        console.error('Error during initial auth check:', error);
        await authService.signOut();
        isProcessingAuth.current = false;
      }
    };

    if (isReady) {
      initAuthFlow();
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [router, exchangeToken, isReady]);

  if (!isReady) {
    return (
      <div className="cognito-login-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner size="lg" />
            <p>Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="cognito-login-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner size="lg" />
            <p>Redirecting to S3 Browser...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cognito-login-container">
      <div className="auth-card">
        <div className="card-header">
          <h3>S3 Browser</h3>
          <p>Sign in to access your S3 buckets</p>
        </div>

        <AuthenticatorWrapper>
          {(authProps) => {
            if (!fallbackActive) {
              requestAnimationFrame(() => {
                setFallbackActive(true);
              });
            }

            return (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <LoadingSpinner className="mx-auto" />
                <p className="status-message loading mt-4">Authenticating...</p>
              </div>
            );
          }}
        </AuthenticatorWrapper>

        {loading && (
          <div className="status-message loading mt-4">
            Exchanging token...
          </div>
        )}

        {error && (
          <div className="status-message error mt-4">
            <p><strong>Authentication Error</strong></p>
            <p>{error.message || 'Token exchange failed'}</p>
          </div>
        )}
      </div>
    </div>
  );
}



