import { NextRequest, NextResponse } from 'next/server';
import { SSOOIDCClient, CreateTokenWithIAMCommand } from '@aws-sdk/client-sso-oidc';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import jwt from 'jsonwebtoken';

const { fromTemporaryCredentials } = require("@aws-sdk/credential-providers");


const region = process.env.VITE_AWS_REGION || 'ap-southeast-1';
const applicationArn = process.env.VITE_AWS_IDENTITY_APPLICATION_ARN;
const identityBearerRoleArn = process.env.VITE_AWS_IDENTITY_BEARER_ROLE_ARN;

const oidcClientId = process.env.VITE_AWS_OIDC_CLIENT_ID

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jwtToken } = body;


    if (!jwtToken) {
      return NextResponse.json({ error: 'Missing required parameter: jwtToken' }, { status: 400 });
    }

    if (!applicationArn) {
      return NextResponse.json({ error: 'AWS_IDENTITY_APPLICATION_ARN env variable not set' }, { status: 500 });
    }

    if (!identityBearerRoleArn) {
      return NextResponse.json({ error: 'AWS_IDENTITY_BEARER_ROLE_ARN env variable not set' }, { status: 500 });
    }

    if(!oidcClientId) {
      return NextResponse.json({error: 'Missing the OIDC Client Id'})
    }


    // Step 1: Exchange token with SSO OIDC
    const ssooidc = new SSOOIDCClient({ region, 
      credentials: fromTemporaryCredentials({
    params: {
      RoleArn: process.env.BOOTSTRAP_ROLE_ARN,
      RoleSessionName: 'ExchangeTokenSession'
    }
  })
     });

    console.log("*********************1**************")

    const createTokenWithIAMCommand = new CreateTokenWithIAMCommand({
      clientId: oidcClientId,
      grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    });

        console.log("*********************2**************")


    const tokenExchangeResponse = await ssooidc.send(createTokenWithIAMCommand);

            console.log("***********************************")


    const idToken : any = tokenExchangeResponse.idToken;

    // Step 2: Decode identity context
    const decodedToken: any = jwt.decode(idToken);
    console.log('▶ Decoded token claims:', Object.keys(decodedToken));

    if (!decodedToken['sts:identity_context']) {
      console.warn('⚠️ Token does not contain sts:identity_context claim');
      return NextResponse.json(
        { error: 'Identity token does not contain sts:identity_context claim' },
        { status: 400 }
      );
    }

    // Step 3: Assume role using STS (relying on task role or instance profile)
    const stsClient = new STSClient({
      region,
      // ✅ No explicit credentials; uses environment/task/instance role
    });

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

    return NextResponse.json({
      identityToken: idToken,
      tokenType: tokenExchangeResponse.tokenType,
      expiresIn: tokenExchangeResponse.expiresIn,
      refreshToken: tokenExchangeResponse.refreshToken,
      assumedCredentials,
    });
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
  }
}
