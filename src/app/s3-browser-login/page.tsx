// 'use client';

// import React, { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Hub } from 'aws-amplify/utils';
// import authService from '@/app/services/auth-service';
// import AuthenticatorWrapper from '@/app/components/AuthenticatorWrapper';
// import { useTokenExchange } from '@/app/hooks/useTokenExchange';
// import { useAppInitialized } from '../context/AppInitContext';

// export default function CognitoLogin() {
//   const { exchangeToken, loading, error } = useTokenExchange();
//   const router = useRouter();
//   const [fallbackActive, setFallbackActive] = useState(false);

  

//   useEffect(() => {
//     let unsubscribe: (() => void) | undefined;

//     const checkAwsCredentials = async () => {
//       try {
//         const storedCredentials = sessionStorage.getItem('aws-credentials');
//         const cognitoTokens = sessionStorage.getItem('cognito-tokens');

//         if (storedCredentials && cognitoTokens) {
//           const credentials = JSON.parse(storedCredentials);
//           const { exchangeTime } = credentials;

//           if (exchangeTime) {
//             const expirationTime = new Date(exchangeTime).getTime() + 3600000; // 1 hour
//             const now = Date.now();

//             if (now < expirationTime) {
//               router.push('/s3-browser');
//               return true;
//             } else {
//               console.log('⚠️ AWS credentials expired.');
//               sessionStorage.removeItem('aws-credentials');
//               await authService.signOut();
//               authService.clearCache();
//             }
//           }
//         } else {
//           await authService.signOut();
//           authService.clearCache();
//         }
//       } catch (e) {
//         console.error('❌ Error parsing stored AWS credentials:', e);
//       }
//       return false;
//     };

//     const init = async () => {
//       const hasValidCreds = await checkAwsCredentials();
//       if (hasValidCreds) return;

//       console.log('👂 Listening to Cognito Hub events');

//       unsubscribe = Hub.listen('auth', async ({ payload }: any) => {
//         console.log('🔁 Auth event received:', payload.event);

//         if (payload.event === 'signedIn') {
//           try {
//             const session = await authService.getSession();

//             console.log("session: ", session)

//             await exchangeToken({ jwtToken: session.idToken });
//             //router.push('/s3-browser');
//           } catch (err) {
//             console.error('🔥 Error during token exchange or session fetch:', err);
//           }
//         }

//         if (payload.event === 'signedOut') {
//           console.log('🔓 Signed out');
//           sessionStorage.removeItem('aws-credentials');
//         }
//       });
//     };

//     init();

//     return () => {
//       if (typeof unsubscribe === 'function') {
//         unsubscribe();
//       }
//     };
//   }, [router, exchangeToken]);


//     const { isReady } = useAppInitialized();

//   if (!isReady) {
//     return <div>Initializing Cognito...</div>;
//   }

//   return (
//     <div
//       className="cognito-login-container"
//       style={{
//         height: '100vh',
//         display: 'flex',
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: '#f7f9fc',
//         padding: '20px',
//       }}
//     >
//       <div
//         className="page-content"
//         style={{
//           display: 'flex',
//           flexDirection: fallbackActive ? 'column' : 'row',
//           width: '80%',
//           maxWidth: '1000px',
//           background: '#fff',
//           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//           borderRadius: '12px',
//           overflow: 'hidden',
//           alignItems: 'center',
//           justifyContent: 'center',
//           padding: '40px',
//           minHeight: '300px',
//         }}
//       >
//         <div
//           style={{
//             flex: fallbackActive ? 'unset' : 1,
//             width: fallbackActive ? '100%' : 'auto',
//             textAlign: 'center',
//           }}
//         >
//           {!fallbackActive && (
//             <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
//               Sign in To S3 Browser
//             </h2>
//           )}
//           <AuthenticatorWrapper>
//             {() => {
//               setFallbackActive(true);
//               return (
//                 <div style={{ textAlign: 'center', marginTop: '20px' }}>
//                   <div
//                     style={{
//                       width: '3rem',
//                       height: '3rem',
//                       border: '4px solid #3498db',
//                       borderTop: '4px solid transparent',
//                       borderRadius: '50%',
//                       animation: 'spin 1s linear infinite',
//                       margin: 'auto',
//                     }}
//                   />
//                   <style jsx>{`
//                     @keyframes spin {
//                       0% {
//                         transform: rotate(0deg);
//                       }
//                       100% {
//                         transform: rotate(360deg);
//                       }
//                     }
//                   `}</style>
//                 </div>
//               );
//             }}
//           </AuthenticatorWrapper>
//           {loading && <p style={{ marginTop: '10px' }}>Exchanging token...</p>}
//           {error && (
//             <p style={{ marginTop: '10px', color: 'red' }}>
//               Error: {error.message || 'Token exchange failed'}
//             </p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }




'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import authService from '@/app/services/auth-service';
import AuthenticatorWrapper from '@/app/components/AuthenticatorWrapper';
import { useTokenExchange } from '@/app/hooks/useTokenExchange';
import { useAppInitialized } from '../context/AppInitContext';

export default function CognitoLogin() {
  const { exchangeToken, loading, error } = useTokenExchange();
  const router = useRouter();
  const [fallbackActive, setFallbackActive] = useState(false);

  const { isReady } = useAppInitialized();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuthFlow = async () => {
      try {
        const isAuthenticated = await authService.isCognitoAuthenticated();

        if (isAuthenticated) {
          console.log('✅ User already authenticated, proceeding to exchange token');
          const session = await authService.getSession();

          console.log("session: ", session);

          await exchangeToken({ jwtToken: session.idToken });
          router.push('/s3-browser');
          return;
        }

        console.log('👂 Listening for Cognito Hub auth events');

        unsubscribe = Hub.listen('auth', async ({ payload }: any) => {
          console.log('🔁 Auth event received:', payload.event);

          if (payload.event === 'signedIn') {
            try {
              const session = await authService.getSession();
              console.log('✅ Signed in, exchanging token');

                        console.log("session: ", session);


              await exchangeToken({ jwtToken: session.idToken });
              router.push('/s3-browser');
            } catch (err) {
              console.error('🔥 Error during token exchange or session fetch:', err);
              await authService.signOut();
              //router.push('/login'); // force fallback to login
            }
          }

          if (payload.event === 'signedOut') {
            console.log('🔓 Signed out, clearing local state');
          }
        });
      } catch (error) {
        console.error('❌ Error during initial auth check:', error);
        await authService.signOut();
        //router.push('/login'); // fallback to login
      }
    };

    initAuthFlow();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [router, exchangeToken]);

  if (!isReady) {
    return <div>Initializing Cognito...</div>;
  }

  return (
    <div
      className="cognito-login-container"
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f9fc',
        padding: '20px',
      }}
    >
      <div
        className="page-content"
        style={{
          display: 'flex',
          flexDirection: fallbackActive ? 'column' : 'row',
          width: '80%',
          maxWidth: '1000px',
          background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          minHeight: '300px',
        }}
      >
        <div
          style={{
            flex: fallbackActive ? 'unset' : 1,
            width: fallbackActive ? '100%' : 'auto',
            textAlign: 'center',
          }}
        >
          {!fallbackActive && (
            <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
              Sign in To S3 Browser
            </h2>
          )}
          <AuthenticatorWrapper>
            {() => {
              setFallbackActive(true);
              return (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      border: '4px solid #3498db',
                      borderTop: '4px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: 'auto',
                    }}
                  />
                  <style jsx>{`
                    @keyframes spin {
                      0% {
                        transform: rotate(0deg);
                      }
                      100% {
                        transform: rotate(360deg);
                      }
                    }
                  `}</style>
                </div>
              );
            }}
          </AuthenticatorWrapper>
          {loading && <p style={{ marginTop: '10px' }}>Exchanging token...</p>}
          {error && (
            <p style={{ marginTop: '10px', color: 'red' }}>
              Error: {error.message || 'Token exchange failed'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
