import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type BiometricKind = 'fingerprint';

const BIOMETRIC_REFRESH_TOKEN_KEY = 'davaine-biometric-refresh-token';

export async function getBiometricKind(): Promise<BiometricKind | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  if (!hasHardware || !isEnrolled) {
    return null;
  }

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  return null;
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function cacheBiometricRefreshToken(refreshToken: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  await SecureStore.setItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY, refreshToken);
}

export async function getCachedBiometricRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  return SecureStore.getItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY);
}

export async function clearCachedBiometricRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  await SecureStore.deleteItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY);
}
