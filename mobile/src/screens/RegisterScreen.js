import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
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
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err.message || 'تعذر إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-forward" size={22} color={colors.ink} />
        </TouchableOpacity>

        <AppText weight="bold" size={24} style={{ marginBottom: spacing.xs }}>
          حساب جديد
        </AppText>
        <AppText color={colors.inkSoft} size={14} style={{ marginBottom: spacing.xl }}>
          ابدأ رحلتك في تتبع صلاتك وأذكارك
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

        <PrimaryButton title="إنشاء الحساب" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.lg }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  back: { marginBottom: spacing.lg, alignSelf: 'flex-end' },
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
