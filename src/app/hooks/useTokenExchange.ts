'use client';

import { useState, useRef } from 'react';

// Global flag to track token exchange across component instances
let globalExchangeInProgress = false;

export function useTokenExchange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const pendingRequest = useRef<Promise<any> | null>(null);
  const isExchanging = useRef<boolean>(false);

  const exchangeToken = async (payload: any) => {
    // Global check first to prevent multiple components from exchanging tokens
    if (globalExchangeInProgress) {
      //console.log('🌎 Global token exchange already in progress');
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!globalExchangeInProgress) {
            clearInterval(checkInterval);
            // Get the credentials from sessionStorage
            try {
              const storedCreds = sessionStorage.getItem('aws-credentials');
              if (storedCreds) {
                resolve(JSON.parse(storedCreds));
              } else {
                reject(new Error('No credentials found after exchange'));
              }
            } catch (err) {
              reject(err);
            }
          }
        }, 100);
      });
    }

    // If there's already a pending request, return it instead of making a new one
    if (pendingRequest.current) {
      //console.log('🔄 Token exchange already in progress, reusing request');
      return pendingRequest.current;
    }

    // Additional flag to prevent race conditions
    if (isExchanging.current) {
      //console.log('🔄 Token exchange already in progress, waiting...');
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!isExchanging.current) {
            clearInterval(checkInterval);
            // Get the credentials from sessionStorage
            try {
              const storedCreds = sessionStorage.getItem('aws-credentials');
              if (storedCreds) {
                resolve(JSON.parse(storedCreds));
              } else {
                reject(new Error('No credentials found after exchange'));
              }
            } catch (err) {
              reject(err);
            }
          }
        }, 100);
      });
    }

    // Set all flags to indicate exchange is in progress
    setLoading(true);
    setError(null);
    isExchanging.current = true;
    globalExchangeInProgress = true;

    // Create the request and store it in the ref
    pendingRequest.current = (async () => {
      try {
        //console.log('🔄 Starting token exchange');
        
        // Check if we already have valid credentials in session storage
        try {
          const storedCreds = sessionStorage.getItem('aws-credentials');
          if (storedCreds) {
            const parsed = JSON.parse(storedCreds);
            if (parsed.assumedCredentials && parsed.exchangeTime) {
              const expiration = new Date(parsed.assumedCredentials.expiration);
              const now = new Date();
              // If credentials are still valid (with 5-minute buffer), reuse them
              if (expiration.getTime() > (now.getTime() + 5 * 60 * 1000)) {
                //console.log('✅ Reusing existing valid credentials');
                return parsed;
              }
              //console.log('⚠️ Stored credentials expired, getting new ones');
            }
          }
        } catch (err) {
          console.warn('Error checking stored credentials, proceeding with exchange:', err);
        }
        
        const response = await fetch('/api/aws/credentials/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          // Ensure the request isn't cached
          cache: 'no-store'
        });

        //console.log("RESPONSE STATUS: ", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Token exchange failed');
        }

        const data = await response.json();
        //console.log('✅ Token exchange successful');

        // Store credentials in session storage
        sessionStorage.setItem(
          'aws-credentials',
          JSON.stringify({
            ...data,
            exchangeTime: Date.now(),
          })
        );

        return data;
      } catch (err: any) {
        console.error('❌ Token exchange failed:', err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
        // Clear the pending request reference
        pendingRequest.current = null;
        isExchanging.current = false;
        globalExchangeInProgress = false; // Reset global flag
      }
    })();

    return pendingRequest.current;
  };

  return { exchangeToken, loading, error };
}
