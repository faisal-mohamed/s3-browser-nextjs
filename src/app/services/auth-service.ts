// 'use client'; // ✅ Mark as client-only module

// import { signOut as amplifySignOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
// import { jwtDecode } from 'jwt-decode';

// /**
//  * Functional service for handling Cognito authentication
//  */
// const createAuthService = () => {
//   const getCurrentUserSafe = async () => {
//     try {
//       return await getCurrentUser();
//     } catch (error) {
//       console.error('Error getting current user:', error);
//       return null;
//     }
//   };

//   const getSession = async () => {
//     try {
//       const stored = sessionStorage.getItem('cognito-tokens');

//       if (stored) {
//         const parsed = JSON.parse(stored);

//         if (parsed.idToken && parsed.accessToken) {
//           const decoded: any = jwtDecode(parsed.idToken);
//           const isTokenValid = decoded.exp * 1000 > Date.now();

//           if (isTokenValid) {
//             console.log('✅ Using stored session tokens from sessionStorage');

//             return {
//               idToken: parsed.idToken,
//               accessToken: parsed.accessToken,
//               refreshToken: parsed.refreshToken,
//             };
//           } else {
//             console.log('⚠️ Token expired, clearing sessionStorage');
//             sessionStorage.removeItem('cognito-tokens');
//           }
//         }
//       }

//       console.log('🔄 Fetching fresh session tokens');
//       const session: any = await fetchAuthSession();

//       console.log("freshAuthSession: ", session)

//       if (session.tokens) {
//         const idToken = session.tokens.idToken.toString();
//         const accessToken = session.tokens.accessToken.toString();
//         const refreshToken = session.tokens.refreshToken?.toString();

//         const decoded: any = jwtDecode(idToken);
//         const expiresAt = decoded.exp * 1000;

//         sessionStorage.setItem(
//           'cognito-tokens',
//           JSON.stringify({ idToken, accessToken, refreshToken, expiresAt })
//         );

//         return { idToken, accessToken, refreshToken };
//       }

//       throw new Error('Tokens not available in fetched session');
//     } catch (error) {
//       console.error('❌ Error getting session:', error);
//       throw error;
//     }
//   };

  

//   const getIdToken = async () => {
//     const session = await getSession();
//     return session.idToken;
//   };

//   const getAccessToken = async () => {
//     const session = await getSession();
//     return session.accessToken;
//   };

//   const signOut = async () => {
//     try {
//       await amplifySignOut();
//       clearCache();
//     } catch (error) {
//       console.error('Error signing out:', error);
//       throw error;
//     }
//   };

//   const clearCache = () => {
//     console.log('Clearing auth cache');
//     sessionStorage.removeItem('cognito-tokens');
//     sessionStorage.removeItem('aws-credentials');
//   };

//   const decodeToken = (token: any) => {
//     try {
//       return jwtDecode(token);
//     } catch (error) {
//       console.error('Error decoding token:', error);
//       return null;
//     }
//   };

//   const getTokenExpiry = (token: string): number | null => {
//     try {
//       const decoded = jwtDecode(token);
//       return decoded.exp ? decoded.exp * 1000 : null;
//     } catch (error) {
//       console.error('Error decoding token for expiry:', error);
//       return null;
//     }
//   };

//   const isCognitoAuthenticated = async () => {
//     try {
//       const userData = await getCurrentUserSafe();
//       if (!userData) return false;

//       const storedCredentials = sessionStorage.getItem('aws-credentials');
//       if (!storedCredentials) return false;

//       const credentials = JSON.parse(storedCredentials);
//       if (credentials.expiration && new Date(credentials.expiration) < new Date()) {
//         return false;
//       }

//       return true;
//     } catch (error) {
//       console.error('Error checking Cognito authentication:', error);
//       return false;
//     }
//   };

//   const checkCredentialsValidity = () => {
//     try {
//       const storedCredentials = sessionStorage.getItem('aws-credentials');
//       if (!storedCredentials) return false;

//       const credentials = JSON.parse(storedCredentials);
//       if (credentials.expiration) {
//         const expirationTime = new Date(credentials.expiration).getTime();
//         const currentTime = new Date().getTime();

//         if (expirationTime <= currentTime) {
//           return false;
//         }
//       }

//       return true;
//     } catch (e) {
//       console.error('Error checking credentials validity:', e);
//       return false;
//     }
//   };

//   const getSSOCredentials = () => {
//     try {
//       const storedCredentials = sessionStorage.getItem('aws-credentials');
//       if (!storedCredentials) return null;

//       const credentials = JSON.parse(storedCredentials);
//       if (credentials.expiration) {
//         const expirationTime = new Date(credentials.expiration).getTime();
//         const currentTime = new Date().getTime();

//         if (expirationTime <= currentTime) {
//           return false;
//         }
//       }

//       return {
//         accessKeyId: credentials.accessKeyId,
//         secretAccessKey: credentials.secretAccessKey,
//         sessionToken: credentials.sessionToken,
//       };
//     } catch (error) {
//       console.log('Error Getting SSO Credentials');
//     }
//   };

//   return {
//     getCurrentUser: getCurrentUserSafe,
//     getSession,
//     getIdToken,
//     getAccessToken,
//     signOut,
//     clearCache,
//     decodeToken,
//     getTokenExpiry,
//     isCognitoAuthenticated,
//     checkCredentialsValidity,
//     getSSOCredentials,
//   };
// };

// const authService = createAuthService();

// export default authService;



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
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  const getSession = async () => {
    try {
      const session = await fetchAuthSession();

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
    } catch (error) {
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

  const isCognitoAuthenticated = async () => {
    try {
      const user = await getCurrentUserSafe();
      if (!user) return false;

      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken;
    } catch (error) {
      console.error('Error checking Cognito authentication:', error);
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

    console.log("PARSED: ", parsed.assumedCredentials)

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
    getAWSCredentialsFromSession
  };
};

const authService = createAuthService();

export default authService;



