'use client';

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { useEnvVars } from '../hooks/useEnvVars';
import AppInitContext from '../context/AppInitContext';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const { envVars, isLoading, isError } = useEnvVars();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && envVars && !initialized) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: envVars.VITE_COGNITO_USER_POOL_ID,
            userPoolClientId: envVars.VITE_COGNITO_CLIENT_ID,
          }
        }
      });
      console.log('✅ Amplify configured with dynamic envs');
      setInitialized(true);
    }
  }, [envVars, isLoading, initialized]);

  if (isLoading) return <div>Loading app...</div>;
  if (isError) return <div>Error loading app configuration</div>;

  return (
    <AppInitContext.Provider value={{ isReady: initialized }}>
      {children}
    </AppInitContext.Provider>
  );
}
