import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type FocusEvent,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { AppIcon } from "@/components/ui/AppIcon";
import { useModalKeyboardFocus } from "@/components/ui/modals/Modal";
import { DefaultTheme } from "@/constants/defaultTheme";
import type { AppIconName } from "@/constants/icons";

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  icon?: AppIconName;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  returnKeyType?: TextInputProps["returnKeyType"];
  maxLength?: number;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const ERROR_COLOR = "#D64545";

const FIELD_HEIGHT = 45;
const IDLE_LABEL_FONT_SIZE = 14;
const IDLE_LABEL_LINE_HEIGHT = 18;
const IDLE_LABEL_TOP = (FIELD_HEIGHT - IDLE_LABEL_LINE_HEIGHT) / 2;
const FOCUSED_LABEL_FONT_SIZE = 11;
const FOCUSED_LABEL_LINE_HEIGHT = 14;
const FOCUSED_LABEL_TOP = -10;

const webOutlineReset: any =
  Platform.OS === "web" ? { outline: "none", boxShadow: "none" } : undefined;

export function Input({
  label,
  value,
  onChangeText,
  error,
  icon,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  returnKeyType,
  maxLength,
  onSubmitEditing,
  style,
  accessibilityLabel,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValueHidden, setIsValueHidden] = useState(secureTextEntry);
  const labelProgress = useRef(
    new Animated.Value(value.length > 0 ? 1 : 0),
  ).current;
  const focusField = useModalKeyboardFocus();

  const animateLabel = (toValue: number) => {
    Animated.timing(labelProgress, {
      toValue,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleFocus = (event: FocusEvent) => {
    setIsFocused(true);
    animateLabel(1);
    focusField?.(event.target);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value.length === 0) {
      animateLabel(0);
    }
  };

  const hasError = Boolean(error);
  const borderColor = hasError
    ? ERROR_COLOR
    : isFocused
      ? DefaultTheme.colors.primary
      : DefaultTheme.colors.line;

  const accentColor = hasError
    ? ERROR_COLOR
    : isFocused
      ? DefaultTheme.colors.primary
      : DefaultTheme.colors.muted;

  const labelTop = labelProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [IDLE_LABEL_TOP, FOCUSED_LABEL_TOP],
  });
  const labelFontSize = labelProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [IDLE_LABEL_FONT_SIZE, FOCUSED_LABEL_FONT_SIZE],
  });
  const labelLineHeight = labelProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [IDLE_LABEL_LINE_HEIGHT, FOCUSED_LABEL_LINE_HEIGHT],
  });

  return (
    <View style={style}>
      <View style={[styles.field, { borderColor }]}>
        {icon && (
          <View style={styles.leadingIcon}>
            <AppIcon name={icon} size={18} tintColor={accentColor} />
          </View>
        )}
        <View style={styles.fieldBody}>
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.label,
              {
                top: labelTop,
                fontSize: labelFontSize,
                lineHeight: labelLineHeight,
                color: accentColor,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isValueHidden}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            textContentType={textContentType}
            returnKeyType={returnKeyType}
            maxLength={maxLength}
            onSubmitEditing={onSubmitEditing}
            accessibilityLabel={accessibilityLabel ?? label}
            style={[styles.input, webOutlineReset]}
            placeholderTextColor={DefaultTheme.colors.muted}
            cursorColor={DefaultTheme.colors.primary}
            underlineColorAndroid="transparent"
          />
        </View>
        {secureTextEntry && (
          <Pressable
            onPress={() => setIsValueHidden((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={
              isValueHidden ? "Show password" : "Hide password"
            }
            style={styles.toggle}
            hitSlop={8}
          >
            <AppIcon
              name={isValueHidden ? "eye" : "eyeOff"}
              size={18}
              tintColor={DefaultTheme.colors.muted}
            />
          </Pressable>
        )}
      </View>
      {hasError && <Animated.Text style={styles.error}>{error}</Animated.Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: FIELD_HEIGHT,
    borderWidth: 1.5,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "stretch",
  },
  leadingIcon: {
    width: 22,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBody: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    position: "absolute",
    left: -4,
    paddingHorizontal: 4,
    backgroundColor: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: FIELD_HEIGHT,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: DefaultTheme.colors.ink,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        padding: 0,
        textAlignVertical: "center",
      },
      default: {},
    }),
  },
  toggle: {
    width: 32,
    height: 32,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginTop: 6,
    marginLeft: 4,
    color: ERROR_COLOR,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
});
