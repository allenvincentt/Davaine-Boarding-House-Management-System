import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/DefaultTheme';

export default function RootLayout() {
  useFonts({
    [FontFamily.heading]: InstrumentSerif_400Regular,
    [FontFamily.headingItalic]: InstrumentSerif_400Regular_Italic,
    [FontFamily.body]: DMSans_400Regular,
    [FontFamily.bodyMedium]: DMSans_500Medium,
    [FontFamily.bodySemiBold]: DMSans_600SemiBold,
    [FontFamily.bodyBold]: DMSans_700Bold,
  });

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
