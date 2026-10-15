'use client';

import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

interface Auth0ProviderWrapperProps {
  children: React.ReactNode;
}

export function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';

  const redirectUri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    if (typeof window !== 'undefined') {
      const target = appState?.returnTo || window.location.pathname;
      window.history.replaceState({}, document.title, target);
      window.dispatchEvent(new CustomEvent('l2u_auth_change'));
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
