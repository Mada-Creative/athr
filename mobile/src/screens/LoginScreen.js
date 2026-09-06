import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import SocialAuthButtons from '../components/SocialAuthButtons';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <AppText color={colors.inkSoft} size={14} style={{ marginTop: spacing.md }}>
            اجعل لعبادتك أثرًا يوميًا
          </AppText>
        </View>

        <View style={styles.form}>
          <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
            البريد الإلكتروني
          </AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            textAlign="right"
          />

          <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
            كلمة المرور
          </AppText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.inkFaint}
            secureTextEntry
            textAlign="right"
          />

          {error ? (
            <AppText color={colors.clay} size={13} style={{ marginBottom: spacing.sm }}>
              {error}
            </AppText>
          ) : null}

          <PrimaryButton title="تسجيل الدخول" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

          <SocialAuthButtons onError={setError} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchLink}>
            <AppText size={13.5} color={colors.inkSoft}>
              ليس لديك حساب؟ <AppText weight="semibold" color={colors.amberDeep}>أنشئ حسابًا جديدًا</AppText>
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { width: 128, height: 128 },
  form: { gap: 0 },
  label: { marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: 15,
    color: colors.ink,
  },
  switchLink: { alignItems: 'center', marginTop: spacing.lg },
});
