import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_OAUTH } from '../config/oauth';

// Required once per app so the browser tab opened for sign-in can hand
// control back to the app when Google redirects.
WebBrowser.maybeCompleteAuthSession();

/**
 * Wraps expo-auth-session's Google provider and calls `onIdToken` with the
 * verified-on-Google's-side ID token once the user finishes signing in.
 * The backend still re-verifies that token — this hook only gets it.
 */
export default function useGoogleAuth(onIdToken) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_OAUTH.webClientId,
    iosClientId: GOOGLE_OAUTH.iosClientId,
    androidClientId: GOOGLE_OAUTH.androidClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken || response.params?.id_token;
    if (idToken) onIdToken(idToken);
  }, [response, onIdToken]);

  return { request, promptAsync };
}
