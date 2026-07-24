import { Platform, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { DefaultTheme } from '@/constants/defaultTheme';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const webOutlineReset: any =
  Platform.OS === 'web' ? { outline: 'none', boxShadow: 'none' } : undefined;

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search…',
  style,
  accessibilityLabel,
}: SearchFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <AppIcon name="search" size={16} tintColor={DefaultTheme.colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={[styles.input, webOutlineReset]}
        placeholderTextColor={DefaultTheme.colors.muted}
        cursorColor={DefaultTheme.colors.primary}
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 14,
    color: DefaultTheme.colors.ink,
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: 'center' },
      default: {},
    }),
  },
});
