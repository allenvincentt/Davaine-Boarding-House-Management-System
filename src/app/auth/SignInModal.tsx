import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Input } from '@/components/ui/Input';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/DefaultTheme';
import { Gradient } from '@/constants/Gradient';

type SignInValues = {
  email: string;
  password: string;
};

type SignInModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (values: SignInValues) => void;
  onForgotPassword?: () => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const webHeroGradient: ViewStyle & { backgroundImage: string } = {
  backgroundImage: Gradient.base,
};

export function SignInModal({ visible, onClose, onSubmit, onForgotPassword }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    resetForm();
  }, [onClose, resetForm]);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
    setErrors((current) => (current.email ? { ...current, email: undefined } : current));
  }, []);

  const handleChangePassword = useCallback((text: string) => {
    setPassword(text);
    setErrors((current) => (current.password ? { ...current, password: undefined } : current));
  }, []);

  const handleSubmit = useCallback(() => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    onSubmit?.({ email: email.trim(), password });
  }, [email, password, onSubmit]);

  const signInLabel = useMemo(
    () => (
      <>
        <Text style={styles.signInLabel}>Sign In</Text>
        <Text style={styles.signInArrow}>{'→'}</Text>
      </>
    ),
    [],
  );

  return (
    <Modal visible={visible} onClose={handleClose} contentStyle={styles.modalContent}>
      <View style={styles.hero}>
        <View
          pointerEvents="none"
          style={[styles.heroGradient, Platform.OS === 'web' && webHeroGradient]}
        />
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
          hitSlop={10}
          style={styles.closeButton}>
          <AppIcon name="close" size={16} tintColor={DefaultTheme.colors.white} />
        </Pressable>
        <View style={styles.heroMark}>
          <Image
            accessible={false}
            source={require('../../../assets/images/davaine-mark.svg')}
            contentFit="contain"
            style={styles.heroMarkImage}
          />
        </View>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to manage your stay at Davaine</Text>

        <Input
          label="Email Address"
          value={email}
          onChangeText={handleChangeEmail}
          error={errors.email}
          icon="at"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          style={styles.field}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={handleChangePassword}
          error={errors.password}
          icon="lock"
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          style={styles.field}
        />

        <GradientButton
          accessibilityLabel="Sign in"
          onPress={handleSubmit}
          style={styles.submitButton}>
          {signInLabel}
        </GradientButton>

        <Pressable
          onPress={onForgotPassword}
          accessibilityRole="button"
          accessibilityLabel="Forgot your password"
          style={styles.forgotButton}
          hitSlop={8}>
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    maxWidth: 400,
  },
  hero: {
    height: 210,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: Gradient.base,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroMark: {
    width: 72,
    height: 72,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.white,
  },
  heroMarkImage: {
    width: 40,
    height: 40,
  },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: DefaultTheme.radius.lg,
    borderTopRightRadius: DefaultTheme.radius.lg,
    backgroundColor: DefaultTheme.colors.white,
    paddingHorizontal: 26,
    paddingTop: 40,
    paddingBottom: 48,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.heading,
    fontSize: 27,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  field: {
    marginTop: 22,
    marginHorizontal: 8,
  },
  submitButton: {
    marginTop: 26,
    alignSelf: 'stretch',
  },
  signInLabel: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  signInArrow: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
    lineHeight: 16,
  },
  forgotButton: {
    marginTop: 18,
    alignSelf: 'center',
  },
  forgotText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
});
