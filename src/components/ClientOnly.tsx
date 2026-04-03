"use client";

import { ComponentType, useEffect, useState } from "react";

/**
 * Wrapper component that only renders children on the client side
 * Prevents SSR/hydration issues with browser-only code
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * HOC to wrap a component and make it client-side only
 */
export function withClientOnly<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function ClientOnlyWrapper(props: P) {
    return (
      <ClientOnly fallback={fallback}>
        <Component {...props} />
      </ClientOnly>
    );
  };
}

export default ClientOnly;
