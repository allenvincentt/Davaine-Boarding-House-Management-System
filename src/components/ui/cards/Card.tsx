import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';

type CardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ title, subtitle, action, children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle || action) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    shadowColor: '#4D4E47',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15.5,
  },
  subtitle: {
    marginTop: 3,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
});
