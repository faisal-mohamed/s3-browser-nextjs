'use client';

import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { AuthUser } from '@aws-amplify/auth';

interface AuthenticatorWrapperProps {
  children: (props: { signOut?: (data?: any) => void; user?: AuthUser }) => React.ReactElement;
}

/**
 * A wrapper component for AWS Amplify Authenticator
 * Provides a consistent authentication UI with Cognito
 */
const AuthenticatorWrapper: React.FC<AuthenticatorWrapperProps> = ({ children }) => {
  return (
    <Authenticator>
      {(authProps): React.ReactElement => {
        // Simply pass the auth props directly to children
        // This avoids any hook ordering issues
        return children(authProps);
      }}
    </Authenticator>
  );
};

export default AuthenticatorWrapper;
