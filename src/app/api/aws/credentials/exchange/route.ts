import { NextRequest, NextResponse } from 'next/server';
import { SSOOIDCClient, CreateTokenWithIAMCommand } from '@aws-sdk/client-sso-oidc';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import jwt from 'jsonwebtoken';

const { fromTemporaryCredentials } = require("@aws-sdk/credential-providers");

// Track ongoing requests to prevent duplicates - use a global variable that persists between requests
const ongoingRequests = new Map();
// Track tokens that have been successfully processed to prevent duplicates
const processedTokens = new Set();

const region = process.env.VITE_AWS_REGION || 'ap-southeast-1';
const applicationArn = process.env.VITE_AWS_IDENTITY_APPLICATION_ARN;
const identityBearerRoleArn = process.env.VITE_AWS_IDENTITY_BEARER_ROLE_ARN;
const oidcClientId = process.env.VITE_AWS_OIDC_CLIENT_ID;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jwtToken } = body;

    if (!jwtToken) {
      return NextResponse.json({ error: 'Missing required parameter: jwtToken' }, { status: 400 });
    }

    // Check for required environment variables
    if (!applicationArn) {
      return NextResponse.json({ error: 'AWS_IDENTITY_APPLICATION_ARN env variable not set' }, { status: 500 });
    }

    if (!identityBearerRoleArn) {
      return NextResponse.json({ error: 'AWS_IDENTITY_BEARER_ROLE_ARN env variable not set' }, { status: 500 });
    }

    if(!oidcClientId) {
      return NextResponse.json({error: 'Missing the OIDC Client Id'}, { status: 500 });
    }

    // Generate a unique key for this token
    const requestKey = jwtToken.slice(-20); // Use last 20 chars as a unique identifier
    
    // Check if we've already successfully processed this token
    if (processedTokens.has(requestKey)) {
      console.log('✅ Token already successfully processed, returning cached result');
      return NextResponse.json({ 
        message: 'Token already processed successfully',
        success: true,
        cached: true
      });
    }

    // Check if there's already an ongoing request for this token
    if (ongoingRequests.has(requestKey)) {
      console.log('⚠️ Duplicate token exchange request detected, waiting for existing request');
      try {
        // Wait for the existing request to complete
        const result = await ongoingRequests.get(requestKey);
        return NextResponse.json(result);
      } catch (error: any) {
        console.error('❌ Error from existing request:', error);
        return NextResponse.json(
          { error: 'Failed to exchange token', message: error.message },
          { status: 500 }
        );
      }
    }

    // Create a promise for this request
    const requestPromise = (async () => {
      let retryCount = 0;
      const MAX_RETRIES = 2;
      
      while (retryCount <= MAX_RETRIES) {
        try {
          console.log(`Token exchange attempt ${retryCount + 1}/${MAX_RETRIES + 1}`);
          
          // Step 1: Exchange token with SSO OIDC
          const ssooidc = new SSOOIDCClient({ 
            region, 
            credentials: fromTemporaryCredentials({
              params: {
                RoleArn: process.env.BOOTSTRAP_ROLE_ARN,
                RoleSessionName: 'ExchangeTokenSession'
              }
            })
          });

          console.log("Creating token with IAM command");
          const createTokenWithIAMCommand = new CreateTokenWithIAMCommand({
            clientId: oidcClientId,
            grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtToken,
          });

          console.log("Sending token exchange request");
          const tokenExchangeResponse = await ssooidc.send(createTokenWithIAMCommand);
          console.log("Token exchange successful");

          const idToken : any = tokenExchangeResponse.idToken;

          // Step 2: Decode identity context
          const decodedToken: any = jwt.decode(idToken);
          console.log('▶ Decoded token claims:', Object.keys(decodedToken));

          if (!decodedToken['sts:identity_context']) {
            console.warn('⚠️ Token does not contain sts:identity_context claim');
            return {
              error: 'Identity token does not contain sts:identity_context claim'
            };
          }

          // Step 3: Assume role using STS
          const stsClient = new STSClient({ region });

          const assumeRoleCommand = new AssumeRoleCommand({
            RoleArn: identityBearerRoleArn,
            RoleSessionName: 'S3AccessSession',
            ProvidedContexts: [
              {
                ProviderArn: 'arn:aws:iam::aws:contextProvider/IdentityCenter',
                ContextAssertion: decodedToken['sts:identity_context'],
              },
            ],
          });

          console.log('▶ Assuming role with identity context');
          const stsResponse = await stsClient.send(assumeRoleCommand);
          console.log('✅ Role assumed successfully');

          const assumedCredentials = {
            accessKeyId: stsResponse.Credentials?.AccessKeyId,
            secretAccessKey: stsResponse.Credentials?.SecretAccessKey,
            sessionToken: stsResponse.Credentials?.SessionToken,
            expiration: stsResponse.Credentials?.Expiration,
          };

          // Add this token to the processed set
          processedTokens.add(requestKey);
          
          // Clean up old processed tokens after 1 hour
          setTimeout(() => {
            processedTokens.delete(requestKey);
          }, 60 * 60 * 1000);

          return {
            identityToken: idToken,
            tokenType: tokenExchangeResponse.tokenType,
            expiresIn: tokenExchangeResponse.expiresIn,
            refreshToken: tokenExchangeResponse.refreshToken,
            assumedCredentials,
          };
        } catch (error: any) {
          console.error(`❌ Error exchanging token (attempt ${retryCount + 1}):`, error);
          
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            // Add exponential backoff
            const delay = Math.pow(2, retryCount) * 500;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
      
      throw new Error('Max retries exceeded');
    })();

    // Store the promise in the map
    ongoingRequests.set(requestKey, requestPromise);

    try {
      // Wait for the request to complete
      const result = await requestPromise;
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('❌ Error exchanging token:', error);
      return NextResponse.json(
        {
          error: 'Failed to exchange token',
          message: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    } finally {
      // Clean up the map entry
      setTimeout(() => {
        ongoingRequests.delete(requestKey);
      }, 5000); // Keep the result for 5 seconds in case of near-simultaneous requests
    }
  } catch (error: any) {
    console.error('❌ Unexpected error in token exchange:', error);
    return NextResponse.json(
      {
        error: 'Failed to process token exchange',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
