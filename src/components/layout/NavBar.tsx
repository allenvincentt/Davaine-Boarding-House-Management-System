import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DefaultTheme } from '@/constants/DefaultTheme';
import type { AppIconName } from '@/constants/icons';
import { landingNavigation, type LandingSection } from '@/constants/landing';
import { AppIcon } from '@/components/ui/AppIcon';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { SignInModal } from '@/app/auth/SignInModal';

type NavBarProps = {
  activeSection: LandingSection;
  onNavigate: (section: LandingSection) => void;
  scrollY: number;
};

export function NavBar({ activeSection, onNavigate, scrollY }: NavBarProps) {
  const { width } = useWindowDimensions();
  const { top: safeAreaTop, bottom: safeAreaBottom } = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;
  const requestedIndicatorSection = useRef<LandingSection | null>(null);
  const indicatorInitialized = useRef(false);
  const previousScrollY = useRef(scrollY);
  const compactProgress = useRef(new Animated.Value(0)).current;
  const compactState = useRef(0);
  const linkLayouts = useRef<Partial<Record<LandingSection, { x: number; width: number }>>>({});
  const compact = width < DefaultTheme.layout.compactNavigation;

  useEffect(() => {
    if (!compact) {
      previousScrollY.current = scrollY;
      return;
    }

    const delta = scrollY - previousScrollY.current;
    previousScrollY.current = scrollY;

    if (Math.abs(delta) < 4) {
      return;
    }

    const nextState = delta > 0 && scrollY > 24 ? 1 : 0;
    if (nextState === compactState.current) {
      return;
    }

    compactState.current = nextState;
    Animated.timing(compactProgress, {
      toValue: nextState,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [compact, scrollY, compactProgress]);

  const transitionIndicator = useCallback(
    (section: LandingSection) => {
      const layout = linkLayouts.current[section];
      if (!layout) {
        return;
      }

      indicatorX.stopAnimation();
      indicatorWidth.stopAnimation();
      indicatorScale.stopAnimation();
      indicatorX.setValue(layout.x);
      indicatorWidth.setValue(layout.width);
      indicatorScale.setValue(0);

      Animated.timing(indicatorScale, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [indicatorScale, indicatorWidth, indicatorX],
  );

  useEffect(() => {
    if (requestedIndicatorSection.current === activeSection) {
      requestedIndicatorSection.current = null;
      return;
    }

    transitionIndicator(activeSection);
  }, [activeSection, transitionIndicator]);

  const navigate = (section: LandingSection) => {
    requestedIndicatorSection.current = section;
    transitionIndicator(section);
    onNavigate(section);
  };

  const handleLinkLayout = (section: LandingSection, event: LayoutChangeEvent) => {
    const { x, width: linkWidth } = event.nativeEvent.layout;
    linkLayouts.current[section] = { x, width: linkWidth };

    if (section === activeSection && !indicatorInitialized.current) {
      indicatorX.setValue(x);
      indicatorWidth.setValue(linkWidth);
      indicatorScale.setValue(1);
      indicatorInitialized.current = true;
    }
  };

  if (compact) {
    return (
      <>
        <Animated.View
          style={[
            styles.mobileTopShell,
            {
              top: safeAreaTop + 8,
              height: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [66, 54] }),
              paddingHorizontal: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 10] }),
              borderRadius: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [34, 27] }),
            },
          ]}>
          <View style={styles.mobileTopBrand}>
            <View style={styles.mobileTopMark}>
              <DavaineMark size={36} />
            </View>
            <Text style={styles.mobileTopName}>Davaine</Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  scale: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }),
                },
              ],
            }}>
            <GradientButton
              accessibilityLabel="Sign In"
              style={styles.mobileTopSignIn}
              onPress={() => setSignInOpen(true)}>
              <Text style={styles.signInLabel}>Sign In</Text>
              <Text style={styles.signInArrow}>→</Text>
            </GradientButton>
          </Animated.View>
        </Animated.View>
        <Animated.View
        style={[
          styles.mobileFloatingShell,
          {
            bottom: Math.max(safeAreaBottom, 10) + 10,
            height: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [72, 58] }),
            paddingHorizontal: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [5, 4] }),
            paddingVertical: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [5, 4] }),
            borderRadius: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [36, 29] }),
          },
        ]}>
        <View pointerEvents="none" style={styles.glassReflection} />
        <View style={styles.mobileFloatingContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to home"
            style={styles.hiddenMobileBrand}
            onPress={() => navigate('home')}>
            <View style={styles.mobileBrandMark}>
              <DavaineMark size={38} />
            </View>
          </Pressable>
          <View style={styles.mobileLinks}>
            {landingNavigation.map((link) => (
              <FloatingNavLink
                key={link.section}
                link={link}
                active={activeSection === link.section}
                compactProgress={compactProgress}
                onPress={() => navigate(link.section)}
              />
            ))}
          </View>
        </View>
      </Animated.View>
      <SignInModal visible={signInOpen} onClose={() => setSignInOpen(false)} />
      </>
    );
  }

  return (
    <View style={[styles.shell, { paddingTop: safeAreaTop }] }>
      <View style={styles.navbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to Davaine home"
          style={styles.brand}
          onPress={() => navigate('home')}>
          <View style={styles.brandMark}>
            <DavaineMark size={31} />
          </View>
          <Text style={styles.brandName}>Davaine</Text>
        </Pressable>

        {!compact && (
          <View style={styles.links}>
            {landingNavigation.map((link) => (
              <AnimatedNavLink
                key={link.section}
                link={link}
                active={activeSection === link.section}
                onPress={() => navigate(link.section)}
                onLayout={(event) => handleLinkLayout(link.section, event)}
              />
            ))}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeIndicator,
                {
                  left: indicatorX,
                  width: indicatorWidth,
                  transform: [{ scaleX: indicatorScale }],
                },
              ]}
            />
          </View>
        )}

        {compact ? (
          <Pressable style={styles.menuButton} onPress={() => setMenuOpen((current) => !current)}>
            <Text style={styles.menuButtonText}>{menuOpen ? '×' : '☰'}</Text>
          </Pressable>
        ) : (
          <GradientButton
            accessibilityLabel="Sign In"
            style={styles.signInButton}
            onPress={() => setSignInOpen(true)}>
            <Text style={styles.signInLabel}>Sign In</Text>
            <Text style={styles.signInArrow}>→</Text>
          </GradientButton>
        )}
      </View>

      {false && menuOpen && (
        <View style={styles.menu}>
          {landingNavigation.map((link) => (
            <AnimatedNavLink
              key={link.section}
              link={link}
              active={activeSection === link.section}
              menu
              onPress={() => navigate(link.section)}
            />
          ))}
          <GradientButton
            accessibilityLabel="Sign In"
            style={styles.mobileSignInButton}
            onPress={() => setSignInOpen(true)}>
            <Text style={styles.signInLabel}>Sign In</Text>
            <Text style={styles.signInArrow}>→</Text>
          </GradientButton>
        </View>
      )}
      <SignInModal visible={signInOpen} onClose={() => setSignInOpen(false)} />
    </View>
  );
}

function DavaineMark({ size }: { size: number }) {
  return (
    <Image
      accessible={false}
      source={require('../../../assets/images/davaine-mark.svg')}
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}

function FloatingNavLink({
  link,
  active,
  compactProgress,
  onPress,
}: {
  link: (typeof landingNavigation)[number];
  active: boolean;
  compactProgress: Animated.Value;
  onPress: () => void;
}) {
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressProgress = useRef(new Animated.Value(0)).current;
  const icon = ({
    home: 'home',
    rooms: 'rooms',
    billing: 'money',
    about: 'about',
  } satisfies Record<LandingSection, AppIconName>)[link.section];

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressProgress, {
      toValue,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={link.label}
      style={styles.mobileLink}
      onPress={onPress}
      onPressIn={() => animatePress(1)}
      onPressOut={() => animatePress(0)}>
      <Animated.View
        style={[
          styles.mobileLinkContent,
          {
            transform: [
              {
                scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }),
              },
            ],
          },
        ]}>
        <View style={styles.mobileIconShell}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.mobileActiveBubble,
              {
                opacity: activeProgress,
                transform: [
                  {
                    scale: activeProgress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.mobileLinkIcon,
              {
                opacity: activeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              },
            ]}>
            <AppIcon name={icon} size={19} tintColor={DefaultTheme.colors.muted} />
          </Animated.View>
          <Animated.View style={[styles.mobileLinkIcon, { opacity: activeProgress }]}>
            <AppIcon name={icon} size={19} tintColor={DefaultTheme.colors.white} />
          </Animated.View>
        </View>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.1}
          style={[
            styles.mobileLinkLabel,
            {
              color: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [DefaultTheme.colors.muted, DefaultTheme.colors.primary],
              }),
              opacity: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              maxHeight: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [13, 0] }),
              marginTop: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                {
                  translateY: compactProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }),
                },
              ],
            },
          ]}>
          {link.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function AnimatedNavLink({
  link,
  active,
  menu = false,
  onPress,
  onLayout,
}: {
  link: (typeof landingNavigation)[number];
  active: boolean;
  menu?: boolean;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressProgress, {
      toValue,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        menu ? styles.menuLinkWrap : styles.linkWrap,
        {
          transform: [
            {
              scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }),
            },
          ],
        },
      ]}>
      <Pressable
        style={menu ? styles.menuLink : styles.link}
        onPress={onPress}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}>
        <Animated.Text
          style={[
            menu ? styles.menuLinkText : styles.linkText,
            {
              color: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [DefaultTheme.colors.muted, DefaultTheme.colors.primary],
              }),
            },
          ]}>
          {link.label}
        </Animated.Text>
        {menu && <Animated.View style={[styles.menuIndicator, { opacity: activeProgress }]} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mobileTopShell: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 247, 240, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.84)',
    shadowColor: '#69705A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
    zIndex: 31,
  },
  mobileTopBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileTopMark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTopName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
  },
  mobileTopSignIn: {
    minHeight: 42,
    paddingHorizontal: 20,
  },
  mobileFloatingShell: {
    position: 'absolute',
    left: 28,
    right: 28,
    maxWidth: 480,
    alignSelf: 'center',
    padding: 6,
    borderRadius: 36,
    backgroundColor: 'rgba(249, 247, 240, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#69705A',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
    zIndex: 30,
  },
  glassReflection: {
    position: 'absolute',
    top: 1,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  mobileFloatingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mobileBrand: {
    width: 48,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBrandMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLinks: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  hiddenMobileBrand: {
    display: 'none',
  },
  mobileLink: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.md,
  },
  mobileLinkContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileIconShell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileActiveBubble: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.primary,
  },
  mobileLinkIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLinkLabel: {
    width: '100%',
    paddingHorizontal: 2,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  shell: {
    backgroundColor: DefaultTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
    zIndex: 20,
  },
  navbar: {
    width: '100%',
    maxWidth: DefaultTheme.layout.contentWidth,
    minHeight: 66,
    paddingHorizontal: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
  },
  links: {
    position: 'relative',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
  },
  linkWrap: {
    minWidth: 34,
    alignSelf: 'stretch',
  },
  link: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: DefaultTheme.colors.primary,
  },
  signInButton: {
    minHeight: 42,
    paddingHorizontal: 24,
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
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  menuButtonText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 21,
    lineHeight: 22,
  },
  menu: {
    width: '100%',
    maxWidth: DefaultTheme.layout.contentWidth,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingBottom: 18,
    gap: 8,
  },
  menuLink: {
    position: 'relative',
    paddingVertical: 9,
    paddingLeft: 10,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  menuLinkWrap: {
    width: '100%',
  },
  menuLinkText: {
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 14,
  },
  menuIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 3,
    backgroundColor: DefaultTheme.colors.primary,
  },
  mobileSignInButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    marginTop: 6,
    paddingHorizontal: 22,
  },
});
