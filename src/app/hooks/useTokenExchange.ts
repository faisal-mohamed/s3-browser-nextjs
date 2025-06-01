'use client';

import { useState } from 'react';

export function useTokenExchange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const exchangeToken = async (payload: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/aws/credentials/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log("RESPONSE: ", response)

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token exchange failed');
      }

      const data = await response.json();

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
    }
  };

  return { exchangeToken, loading, error };
}
