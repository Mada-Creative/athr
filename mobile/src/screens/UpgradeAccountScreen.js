import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';

// Reached from Settings when the current session is a guest one. Unlike
// Register, this keeps the same account (and everything already tracked
// under it) — it only attaches real credentials so the guest can sign back
// into this same history from another device.
export default function UpgradeAccountScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user, upgradeAccount } = useAuth();
  const [name, setName] = useState(user?.name === 'مستخدم أثر' ? '' : user?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    if (!name || !email || !password) {
      setError('الرجاء تعبئة جميع الحقول');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await upgradeAccount(name.trim(), email.trim(), password);
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'تعذر حفظ الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={30} color={colors.amberDeep} />
        </View>

        <AppText weight="bold" size={22} style={{ textAlign: 'center', marginBottom: spacing.xs }}>
          احفظ بياناتك
        </AppText>
        <AppText color={colors.inkSoft} size={14} style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          كل ما تابعته حتى الآن سيبقى محفوظًا — فقط أضف بريدًا وكلمة مرور لتتمكن من الدخول من أي جهاز
        </AppText>

        <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
          الاسم
        </AppText>
        <TextInput value={name} onChangeText={setName} style={styles.input} textAlign="right" placeholder="اسمك" placeholderTextColor={colors.inkFaint} />

        <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
          البريد الإلكتروني
        </AppText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          textAlign="right"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="example@email.com"
          placeholderTextColor={colors.inkFaint}
        />

        <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
          كلمة المرور
        </AppText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          textAlign="right"
          secureTextEntry
          placeholder="6 أحرف على الأقل"
          placeholderTextColor={colors.inkFaint}
        />

        {error ? (
          <AppText color={colors.clay} size={13} style={{ marginTop: spacing.sm }}>
            {error}
          </AppText>
        ) : null}

        <PrimaryButton title="حفظ الحساب" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.lg }} />

        <SocialAuthButtons onError={setError} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    content: { flexGrow: 1, justifyContent: 'center' },
    iconWrap: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
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
  });
}
