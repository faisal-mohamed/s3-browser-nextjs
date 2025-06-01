'use client';

import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

interface AuthenticatorWrapperProps {
  children: (props: { signOut?: () => void; user?: any }) => React.ReactNode;
}

/**
 * A wrapper component for AWS Amplify Authenticator
 * Provides a consistent authentication UI with Cognito
 */
const AuthenticatorWrapper: React.FC<AuthenticatorWrapperProps> = ({ children }) => {
  return (
    <Authenticator>
      {(authProps) : any => children(authProps)}
    </Authenticator>
  );
};

export default AuthenticatorWrapper;
