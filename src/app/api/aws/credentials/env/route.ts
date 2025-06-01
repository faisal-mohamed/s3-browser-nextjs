import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    VITE_AWS_REGION: process.env.VITE_AWS_REGION || '',
    VITE_COGNITO_USER_POOL_ID: process.env.VITE_COGNITO_USER_POOL_ID || '',
    VITE_COGNITO_CLIENT_ID: process.env.VITE_COGNITO_CLIENT_ID || '',
    VITE_S3_BROWSER_ACCOUNT_ID: process.env.VITE_S3_BROWSER_ACCOUNT_ID || '',
    VITE_SERVER_URI: process.env.VITE_SERVER_URI || '',
    VITE_AWS_IDENTITY_APPLICATION_ARN : process.env.VITE_AWS_IDENTITY_APPLICATION_ARN || '',
    VITE_AWS_IDENTITY_BEARER_ROLE_ARN : process.env.VITE_AWS_IDENTITY_BEARER_ROLE_ARN || '',
    // add all the other env vars you want to expose
    VITE_AWS_OIDC_CLIENT_ID: process.env.VITE_AWS_OIDC_CLIENT_ID || '',
    BOOTSTRAP_ROLE_ARN: process.env.BOOTSTRAP_ROLE_ARN || '',
  };

  return NextResponse.json(envVars);
}
