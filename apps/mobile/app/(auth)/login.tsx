import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { useLogin } from '@/hooks/useAuth';
import { spacing, borderRadius } from '@/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { mutate: login, isPending, error } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const validate = useCallback(() => {
    const errors: typeof validationErrors = {};
    if (!email.trim()) errors.email = 'El correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Correo inválido';
    if (!password) errors.password = 'La contraseña es requerida';
    else if (password.length < 6) errors.password = 'Mínimo 6 caracteres';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(() => {
    if (!validate()) return;
    login({ email: email.trim().toLowerCase(), password });
  }, [email, password, login, validate]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    logoContainer: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    logoText: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.colors.primary,
      letterSpacing: -0.5,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    loginButton: {
      marginTop: spacing.xl,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.xs,
    },
    errorBanner: {
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    errorText: {
      color: '#ef4444',
      fontSize: 13,
      textAlign: 'center',
    },
    footer: {
      marginTop: spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo y título */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>L</Text>
          </View>
          <Text style={styles.title}>LMCU ERP</Text>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
        </View>

        {/* Formulario */}
        <View style={styles.card}>
          {/* Error del servidor */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                {error.statusCode === 401
                  ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
                  : error.message}
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Correo electrónico</Text>
          <TextInput
            mode="outlined"
            placeholder="tu@empresa.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (validationErrors.email) setValidationErrors((e) => ({ ...e, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="email-outline" />}
            error={!!validationErrors.email}
            disabled={isPending}
          />
          {validationErrors.email && (
            <HelperText type="error">{validationErrors.email}</HelperText>
          )}

          <Text style={styles.inputLabel}>Contraseña</Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (validationErrors.password) setValidationErrors((e) => ({ ...e, password: undefined }));
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            error={!!validationErrors.password}
            disabled={isPending}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          {validationErrors.password && (
            <HelperText type="error">{validationErrors.password}</HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isPending}
            disabled={isPending}
            style={styles.loginButton}
            contentStyle={{ height: 48 }}
            labelStyle={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.3 }}
          >
            {isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistema ERP LMCU · v1.0.0{'\n'}
            Para soporte contacta al administrador del sistema
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
