'use client';

import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

interface Auth0ProviderWrapperProps {
  children: React.ReactNode;
}

export function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-vos48ex46zdohk7b.us.auth0.com';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '5ULknQDln3717Y7ALahVo9beuoCEiiM0';

  // Safe redirectUri check for SSR compatibility (avoids server-side `window` reference)
  const redirectUri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const onRedirectCallback = (appState?: { returnTo?: string; tab?: string }) => {
    if (typeof window !== 'undefined') {
      const target = appState?.returnTo || window.location.pathname;
      window.history.replaceState({}, document.title, target);
      if (appState?.tab) {
        window.dispatchEvent(new CustomEvent('l2u_navigate_tab', { detail: appState.tab }));
      }
    }
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}

export default Auth0ProviderWrapper;
