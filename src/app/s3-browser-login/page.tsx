'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  const isProcessingAuth = useRef<boolean>(false);
  const { isReady } = useAppInitialized();
  const authEventHandled = useRef<boolean>(false);
  const [redirecting, setRedirecting] = useState(false);

  // Function to handle redirection with logging
  const redirectToS3Browser = () => {
    console.log('🚀 Redirecting to S3 browser page');
    setRedirecting(true);
    
    // Use a small timeout to ensure state updates complete
    setTimeout(() => {
      router.push('/s3-browser');
    }, 100);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuthFlow = async () => {
      try {
        // Check if user already has valid credentials
        if (authService.hasValidStoredCredentials()) {
          console.log('✅ User has valid stored credentials, redirecting to S3 browser');
          redirectToS3Browser();
          return;
        }

        // Check if user is already authenticated with Cognito
        const isAuthenticated = await authService.isCognitoAuthenticated();

        if (isAuthenticated) {
          console.log('✅ User already authenticated, proceeding to exchange token');
          
          // Prevent duplicate processing
          if (isProcessingAuth.current) {
            console.log('⚠️ Already processing auth, skipping');
            return;
          }
          
          isProcessingAuth.current = true;
          
          try {
            const session = await authService.getSession();
            console.log("Session obtained:", session ? "success" : "failed");
            
            await exchangeToken({ jwtToken: session.idToken });
            console.log('✅ Token exchange successful, redirecting to S3 browser');
            redirectToS3Browser();
          } catch (err) {
            console.error('🔥 Error during token exchange or session fetch:', err);
          } finally {
            isProcessingAuth.current = false;
          }
          return;
        }

        console.log('👂 Listening for Cognito Hub auth events');

        unsubscribe = Hub.listen('auth', async ({ payload }: any) => {
          console.log('🔁 Auth event received:', payload.event);

          if (payload.event === 'signedIn') {
            // Prevent duplicate processing of the same auth event
            if (isProcessingAuth.current || authEventHandled.current) {
              console.log('⚠️ Auth event already handled, skipping');
              return;
            }
            
            isProcessingAuth.current = true;
            authEventHandled.current = true;
            
            try {
              const session = await authService.getSession();
              console.log('✅ Signed in, exchanging token');
              console.log("Session data:", session ? "available" : "missing");

              await exchangeToken({ jwtToken: session.idToken });
              console.log('✅ Token exchange successful, redirecting to S3 browser');
              redirectToS3Browser();
            } catch (err) {
              console.error('🔥 Error during token exchange or session fetch:', err);
              authEventHandled.current = false; // Reset flag to allow retry
              await authService.signOut();
            } finally {
              isProcessingAuth.current = false;
            }
          }

          if (payload.event === 'signedOut') {
            console.log('🔓 Signed out, clearing local state');
            authEventHandled.current = false;
          }
        });
      } catch (error) {
        console.error('❌ Error during initial auth check:', error);
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
    return <div>Initializing Cognito...</div>;
  }

  if (redirecting) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f7f9fc' 
      }}>
        <div style={{ 
          width: '4rem', 
          height: '4rem', 
          border: '5px solid #3498db',
          borderTop: '5px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
        <p style={{ marginTop: '20px', fontSize: '18px' }}>Redirecting to S3 Browser...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
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
            {(authProps) => {
              // Use a safe way to update state without hooks
              if (!fallbackActive) {
                // Use requestAnimationFrame instead of setTimeout for better performance
                requestAnimationFrame(() => {
                  setFallbackActive(true);
                });
              }
              
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
