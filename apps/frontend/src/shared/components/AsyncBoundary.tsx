import type { ReactNode } from 'react';

import { Loading } from './Loading';

interface AsyncBoundaryProps {
  isLoading: boolean;
  isError?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  children: ReactNode;
}

export function AsyncBoundary({
  isLoading,
  isError = false,
  loadingFallback = <Loading />,
  errorFallback = null,
  children,
}: AsyncBoundaryProps) {
  if (isLoading) return <>{loadingFallback}</>;
  if (isError) return <>{errorFallback}</>;
  return <>{children}</>;
}
