'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useEnvVars() {
  const { data, error, isLoading } = useSWR('/api/aws/credentials/env', fetcher);

  return {
    envVars: data,
    isLoading,
    isError: error,
  };
}
