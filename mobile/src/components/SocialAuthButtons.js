import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import AppText from './AppText';
import GoogleIcon from './GoogleIcon';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import useGoogleAuth from '../hooks/useGoogleAuth';

// Shared "or continue with…" block for the Login and Register screens.
// Apple's button only ever renders where Apple's own API says it's
// available (iOS 13+) — Apple's guidelines require that, and it keeps the
// button off Android/web automatically.
export default function SocialAuthButtons({ onError }) {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busyWith, setBusyWith] = useState(null); // 'google' | 'apple' | null

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const onGoogleToken = useCallback(
    async (idToken) => {
      setBusyWith('google');
      try {
        await loginWithGoogle(idToken);
      } catch (err) {
        onError?.(err.message || 'تعذر تسجيل الدخول عبر جوجل');
      } finally {
        setBusyWith(null);
      }
    },
    [loginWithGoogle, onError]
  );

  const { request: googleRequest, promptAsync: promptGoogle } = useGoogleAuth(onGoogleToken);

  const onGooglePress = () => {
    onError?.(null);
    promptGoogle();
  };

  const onApplePress = async () => {
    onError?.(null);
    setBusyWith('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Apple only includes the name in this local result, and only the
      // very first time a user authorizes the app — never inside the token.
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      await loginWithApple(credential.identityToken, fullName);
    } catch (err) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        onError?.(err.message || 'تعذر تسجيل الدخول عبر آبل');
      }
    } finally {
      setBusyWith(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText size={12.5} color={colors.inkSoft}>
          أو
        </AppText>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={styles.googleBtn}
        activeOpacity={0.85}
        disabled={!googleRequest || Boolean(busyWith)}
        onPress={onGooglePress}
      >
        {busyWith === 'google' ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <GoogleIcon size={18} />
            <AppText weight="semibold" size={14.5} style={{ marginRight: spacing.sm }}>
              المتابعة عبر جوجل
            </AppText>
          </>
        )}
      </TouchableOpacity>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={999}
          style={styles.appleBtn}
          onPress={onApplePress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, gap: spacing.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  googleBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  appleBtn: { width: '100%', height: 48 },
});
