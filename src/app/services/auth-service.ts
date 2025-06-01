'use client';

import { signOut as amplifySignOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';

/**
 * Functional service for handling Cognito authentication
 */
const createAuthService = () => {
  const getCurrentUserSafe = async () => {
    try {
      return await getCurrentUser();
    } catch (error : any) {
      // Don't log expected errors when not authenticated
      if (!error.message?.includes('User needs to be authenticated') && 
          !error.message?.includes('Auth UserPool not configured')) {
        console.error('Error getting current user:', error);
      }
      return null;
    }
  };

  const getSession = async () => {
    try {
      const session : any = await fetchAuthSession();

      if (!session.tokens) throw new Error('No tokens available in session');

      const idToken = session.tokens.idToken.toString();
      const accessToken = session.tokens.accessToken.toString();
      const refreshToken = session.tokens.refreshToken?.toString();

      return { idToken, accessToken, refreshToken };
    } catch (error) {
      console.error('❌ Error getting session:', error);
      throw error;
    }
  };

  const getIdToken = async () => {
    const session = await getSession();
    return session.idToken;
  };

  const getAccessToken = async () => {
    const session = await getSession();
    return session.accessToken;
  };

  const signOut = async () => {
    try {
      await amplifySignOut();
      console.log('✅ Signed out successfully');
      // Clear any stored credentials
      sessionStorage.removeItem('aws-credentials');
    } catch (error : any ) {
      // If the error is about not being authenticated, just log it but don't throw
      if (error.message?.includes('User needs to be authenticated')) {
        console.log('ℹ️ User was not authenticated, no need to sign out');
        return;
      }
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const decodeToken = (token: string) => {
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const getTokenExpiry = (token: string): number | null => {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch (error) {
      console.error('Error decoding token for expiry:', error);
      return null;
    }
  };

  const hasValidStoredCredentials = () => {
    try {
      const stored = sessionStorage.getItem('aws-credentials');
      if (!stored) return false;
      
      const parsed = JSON.parse(stored);
      if (!parsed.assumedCredentials || !parsed.exchangeTime) return false;
      
      // Check if credentials are expired
      const expiration = new Date(parsed.assumedCredentials.expiration);
      const now = new Date();
      
      // Add a 5-minute buffer
      return expiration.getTime() > (now.getTime() + 5 * 60 * 1000);
    } catch (e) {
      console.error('Error checking stored credentials:', e);
      return false;
    }
  };

  const isCognitoAuthenticated = async () => {
    try {
      // First check if we have valid AWS credentials in session storage
      if (hasValidStoredCredentials()) {
        console.log('✅ Valid AWS credentials found in session storage');
        return true;
      }
      
      // Otherwise check with Cognito
      const user = await getCurrentUserSafe();
      if (!user) return false;

      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken;
    } catch (error : any) {
      // Don't log expected errors when not authenticated
      if (!error.message?.includes('User needs to be authenticated') && 
          !error.message?.includes('Auth UserPool not configured')) {
        console.error('Error checking Cognito authentication:', error);
      }
      return false;
    }
  };

  function getAWSCredentialsFromSession() {
    try {
      const stored = sessionStorage.getItem('aws-credentials');
      if (!stored) {
        throw new Error('No AWS credentials found in sessionStorage');
      }

      const parsed = JSON.parse(stored);

      if (!parsed.assumedCredentials) {
        throw new Error('Invalid AWS credentials format in sessionStorage');
      }

      const { accessKeyId, secretAccessKey, sessionToken, expiration } = parsed.assumedCredentials;

      if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration) {
        throw new Error('Incomplete AWS credentials in sessionStorage');
      }

      return {
        accessKeyId,
        secretAccessKey,
        sessionToken,
        expiration: new Date(expiration), // convert to Date object
      };
    } catch (error) {
      console.error('Error retrieving AWS credentials from sessionStorage:', error);
      throw error;
    }
  }

  return {
    getCurrentUser: getCurrentUserSafe,
    getSession,
    getIdToken,
    getAccessToken,
    signOut,
    decodeToken,
    getTokenExpiry,
    isCognitoAuthenticated,
    hasValidStoredCredentials,
    getAWSCredentialsFromSession
  };
};

const authService = createAuthService();

export default authService;
