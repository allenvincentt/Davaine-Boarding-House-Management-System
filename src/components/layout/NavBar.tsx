import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DefaultTheme } from '@/constants/defaultTheme';
import { GlassMotion, createGradientStyle } from '@/constants/glassTheme';
import { Gradient } from '@/constants/gradient';
import type { AppIconName } from '@/constants/icons';
import { landingNavigation, type LandingSection } from '@/constants/landing';
import { AppIcon } from '@/components/ui/AppIcon';
import { BrandMark } from '@/components/ui/BrandMark';
import { SplashScreen } from '@/components/common/SplashScreen';
import {
  GlassLensView,
  GlassMaterial,
  GlassPanel,
  useGlassInteraction,
  useGlassLens,
  useLensMagnify,
  type GlassLensController,
  type GlassLensTarget,
} from '@/components/ui/GlassPanel';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { ForgotPasswordModal } from '@/app/auth/ForgotPasswordModal';
import { GuessModeModal } from '@/app/auth/GuessModeModal';
import { SignInModal } from '@/app/auth/SignInModal';
import { useAuth, type SessionResumeResult } from '@/providers/AuthProvider';
import { isGuestRole } from '@/services/accessControl';

type NavBarProps = {
  activeSection: LandingSection;
  onNavigate: (section: LandingSection) => void;
  scrollY: number;
};

type SectionLayouts = Partial<Record<LandingSection, GlassLensTarget>>;

const indicatorGradient = createGradientStyle(Gradient.base);

export function NavBar({ activeSection, onNavigate, scrollY }: NavBarProps) {
  const { width } = useWindowDimensions();
  const { top: safeAreaTop, bottom: safeAreaBottom } = useSafeAreaInsets();
  const router = useRouter();
  const {
    session,
    isGuest,
    biometricAvailable,
    signInWithBiometrics,
    sessionVerified,
    resumeSession,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [guestModeOpen, setGuestModeOpen] = useState(false);
  const [autoUnlocking, setAutoUnlocking] = useState(false);

  const handleSignInPress = useCallback(async () => {
    if (session) {
      const needsUnlock = !sessionVerified;
      if (needsUnlock) {
        setAutoUnlocking(true);
      }

      let outcome: SessionResumeResult;
      try {
        outcome = await resumeSession();
      } catch {
        outcome = 'sign-in-required';
      } finally {
        if (needsUnlock) {
          setAutoUnlocking(false);
        }
      }

      if (outcome === 'cancelled') {
        return;
      }

      if (outcome === 'ready') {
        if (isGuest) {
          setGuestModeOpen(true);
          return;
        }
        router.push('/admin-pages/DashboardPage');
        return;
      }

      setSignInOpen(true);
      return;
    }

    if (biometricAvailable) {
      setAutoUnlocking(true);
      try {
        const profile = await signInWithBiometrics();
        if (isGuestRole(profile.userRole)) {
          setGuestModeOpen(true);
          return;
        }
        router.replace('/admin-pages/DashboardPage');
        return;
      } catch {
        // Fall through to manual sign-in below.
      } finally {
        setAutoUnlocking(false);
      }
    }

    setSignInOpen(true);
  }, [
    session,
    isGuest,
    router,
    biometricAvailable,
    signInWithBiometrics,
    sessionVerified,
    resumeSession,
  ]);

  const handleForgotPassword = useCallback(() => {
    setSignInOpen(false);
    setForgotPasswordOpen(true);
  }, []);

  const handleBackToSignIn = useCallback(() => {
    setForgotPasswordOpen(false);
    setSignInOpen(true);
  }, []);

  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const indicatorReady = useRef(false);
  const previousScrollY = useRef(scrollY);
  const compactProgress = useRef(new Animated.Value(0)).current;
  const compactState = useRef(0);
  const desktopMorph = useRef(new Animated.Value(0)).current;
  const desktopMorphState = useRef(0);
  const compact = width < DefaultTheme.layout.compactNavigation;

  const [desktopLayouts, setDesktopLayouts] = useState<SectionLayouts>({});
  const [mobileLayouts, setMobileLayouts] = useState<SectionLayouts>({});
  const desktopLens = useGlassLens('x');
  const mobileLens = useGlassLens('x');
  const shellInteraction = useGlassInteraction({ shimmerOnPress: false });
  const railInteraction = useGlassInteraction({ shimmerOnPress: false });

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

  useEffect(() => {
    if (compact) {
      return;
    }

    const nextState = scrollY > 18 ? 1 : 0;
    if (nextState === desktopMorphState.current) {
      return;
    }

    desktopMorphState.current = nextState;
    Animated.timing(desktopMorph, {
      toValue: nextState,
      duration: GlassMotion.morph.duration,
      easing: GlassMotion.morph.easing,
      useNativeDriver: false,
    }).start();
    shellInteraction.triggerShimmer();
  }, [compact, scrollY, desktopMorph, shellInteraction]);

  useEffect(() => {
    const target = mobileLayouts[activeSection];
    if (target) {
      mobileLens.moveTo(target);
    }
  }, [activeSection, mobileLayouts, mobileLens]);

  useEffect(() => {
    const target = desktopLayouts[activeSection];
    if (!target) {
      return;
    }

    desktopLens.moveTo(target);

    if (!indicatorReady.current) {
      indicatorReady.current = true;
      indicatorX.setValue(target.x);
      indicatorWidth.setValue(target.width);
      return;
    }

    Animated.parallel([
      Animated.timing(indicatorX, {
        toValue: target.x,
        duration: GlassMotion.travel.duration,
        easing: GlassMotion.travel.easing,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorWidth, {
        toValue: target.width,
        duration: GlassMotion.travel.duration,
        easing: GlassMotion.travel.easing,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeSection, desktopLayouts, desktopLens, indicatorX, indicatorWidth]);

  useEffect(() => {
    if (compact) {
      railInteraction.triggerShimmer();
    }
  }, [activeSection, compact, railInteraction]);

  const navigate = (section: LandingSection) => {
    onNavigate(section);
  };

  const registerDesktopLayout = useCallback((section: LandingSection, event: LayoutChangeEvent) => {
    const { x, y, width: cellWidth, height } = event.nativeEvent.layout;
    const next: GlassLensTarget = {
      x: x - 14,
      y: y + 13,
      width: cellWidth + 28,
      height: Math.max(height - 26, 26),
    };

    setDesktopLayouts((current) => {
      const previous = current[section];
      if (
        previous &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height
      ) {
        return current;
      }
      return { ...current, [section]: next };
    });
  }, []);

  const registerMobileLayout = useCallback((section: LandingSection, event: LayoutChangeEvent) => {
    const { x, y, width: cellWidth, height } = event.nativeEvent.layout;
    const next: GlassLensTarget = {
      x,
      y,
      width: cellWidth,
      height,
    };

    setMobileLayouts((current) => {
      const previous = current[section];
      if (
        previous &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height
      ) {
        return current;
      }
      return { ...current, [section]: next };
    });
  }, []);

  if (compact) {
    return (
      <>
        <GlassPanel
          variant="bar"
          backgroundHint={DefaultTheme.colors.background}
          reflection
          sheen
          interaction={shellInteraction}
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
              <BrandMark size={36} />
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
              onPress={handleSignInPress}>
              <Text style={styles.signInLabel}>Sign In</Text>
              <Text style={styles.signInArrow}>→</Text>
            </GradientButton>
          </Animated.View>
        </GlassPanel>
        <GlassPanel
          variant="floating"
          backgroundHint={DefaultTheme.colors.background}
          reflection
          sheen
          interaction={railInteraction}
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
        <View style={styles.mobileFloatingContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to home"
            style={styles.hiddenMobileBrand}
            onPress={() => navigate('home')}>
            <View style={styles.mobileBrandMark}>
              <BrandMark size={38} />
            </View>
          </Pressable>
          <View style={styles.mobileLinks}>
            <GlassLensView
              lens={mobileLens}
              radius={DefaultTheme.radius.lg}
              backgroundHint={DefaultTheme.colors.background}
            />
            {landingNavigation.map((link) => (
              <FloatingNavLink
                key={link.section}
                link={link}
                active={activeSection === link.section}
                compactProgress={compactProgress}
                lens={mobileLens}
                layout={mobileLayouts[link.section]}
                onLayout={(event) => registerMobileLayout(link.section, event)}
                onPress={() => navigate(link.section)}
              />
            ))}
          </View>
        </View>
      </GlassPanel>
      <SignInModal
        visible={signInOpen}
        onClose={() => setSignInOpen(false)}
        onForgotPassword={handleForgotPassword}
        onGuestSignIn={() => setGuestModeOpen(true)}
      />
      <ForgotPasswordModal
        visible={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onBackToSignIn={handleBackToSignIn}
      />
      <GuessModeModal visible={guestModeOpen} onClose={() => setGuestModeOpen(false)} />
      <RNModal visible={autoUnlocking} transparent={false} animationType="fade" statusBarTranslucent>
        <SplashScreen status="loading" loadingMessage="Signing you in…" />
      </RNModal>
      </>
    );
  }

  return (
    <Animated.View
      style={[
        styles.shell,
        {
          paddingTop: safeAreaTop + 12,
          paddingBottom: desktopMorph.interpolate({ inputRange: [0, 1], outputRange: [12, 10] }),
          paddingHorizontal: desktopMorph.interpolate({ inputRange: [0, 1], outputRange: [16, 14] }),
        },
      ]}>
      <GlassPanel
        variant="floating"
        backgroundHint={DefaultTheme.colors.background}
        reflection
        sheen
        interaction={shellInteraction}
        reflectionStyle={styles.desktopReflection}
        style={[
          styles.navbar,
          {
            height: desktopMorph.interpolate({ inputRange: [0, 1], outputRange: [66, 58] }),
            paddingHorizontal: desktopMorph.interpolate({ inputRange: [0, 1], outputRange: [28, 22] }),
            borderRadius: desktopMorph.interpolate({ inputRange: [0, 1], outputRange: [30, 30] }),
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to Davaine home"
          style={styles.brand}
          onPress={() => navigate('home')}>
          <View style={styles.brandMark}>
            <BrandMark size={31} />
          </View>
          <Text style={styles.brandName}>Davaine</Text>
        </Pressable>

        <View style={styles.links}>
          <GlassLensView
            lens={desktopLens}
            radius={DefaultTheme.radius.pill}
            backgroundHint={DefaultTheme.colors.background}
          />
          {landingNavigation.map((link) => (
            <AnimatedNavLink
              key={link.section}
              link={link}
              active={activeSection === link.section}
              lens={desktopLens}
              layout={desktopLayouts[link.section]}
              onPress={() => navigate(link.section)}
              onLayout={(event) => registerDesktopLayout(link.section, event)}
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeIndicator,
              indicatorGradient,
              { left: indicatorX, width: indicatorWidth },
            ]}
          />
        </View>

        {compact ? (
          <Pressable style={styles.menuButton} onPress={() => setMenuOpen((current) => !current)}>
            <Text style={styles.menuButtonText}>{menuOpen ? '×' : '☰'}</Text>
          </Pressable>
        ) : (
          <GradientButton
            accessibilityLabel="Sign In"
            style={styles.signInButton}
            onPress={handleSignInPress}>
            <Text style={styles.signInLabel}>Sign In</Text>
            <Text style={styles.signInArrow}>→</Text>
          </GradientButton>
        )}
      </GlassPanel>

      {false && menuOpen && (
        <View style={styles.menu}>
          {landingNavigation.map((link) => (
            <AnimatedNavLink
              key={link.section}
              link={link}
              active={activeSection === link.section}
              lens={desktopLens}
              menu
              onPress={() => navigate(link.section)}
            />
          ))}
          <GradientButton
            accessibilityLabel="Sign In"
            style={styles.mobileSignInButton}
            onPress={handleSignInPress}>
            <Text style={styles.signInLabel}>Sign In</Text>
            <Text style={styles.signInArrow}>→</Text>
          </GradientButton>
        </View>
      )}
      <SignInModal
        visible={signInOpen}
        onClose={() => setSignInOpen(false)}
        onForgotPassword={handleForgotPassword}
        onGuestSignIn={() => setGuestModeOpen(true)}
      />
      <ForgotPasswordModal
        visible={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onBackToSignIn={handleBackToSignIn}
      />
      <GuessModeModal visible={guestModeOpen} onClose={() => setGuestModeOpen(false)} />
      <RNModal visible={autoUnlocking} transparent={false} animationType="fade" statusBarTranslucent>
        <SplashScreen status="loading" loadingMessage="Signing you in…" />
      </RNModal>
    </Animated.View>
  );
}

function FloatingNavLink({
  link,
  active,
  compactProgress,
  lens,
  layout,
  onLayout,
  onPress,
}: {
  link: (typeof landingNavigation)[number];
  active: boolean;
  compactProgress: Animated.Value;
  lens: GlassLensController;
  layout?: GlassLensTarget;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
}) {
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const interaction = useGlassInteraction();
  const magnify = useLensMagnify(lens, layout, 'x');
  const icon = ({
    home: 'home',
    rooms: 'rooms',
    billing: 'money',
    about: 'about',
  } satisfies Record<LandingSection, AppIconName>)[link.section];

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: GlassMotion.travel.duration,
      easing: GlassMotion.travel.easing,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const scale = useMemo(
    () =>
      Animated.multiply(
        interaction.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }),
        magnify ?? 1,
      ),
    [interaction.press, magnify],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={link.label}
      style={styles.mobileLink}
      onLayout={onLayout}
      onPress={onPress}
      onHoverIn={interaction.handlers.onHoverIn}
      onHoverOut={interaction.handlers.onHoverOut}
      onPressIn={interaction.handlers.onPressIn}
      onPressOut={interaction.handlers.onPressOut}>
      <Animated.View style={[styles.mobileLinkContent, { transform: [{ scale }] }]}>
        <View style={styles.mobileIconShell}>
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
            <AppIcon name={icon} size={19} tintColor={DefaultTheme.colors.primary} />
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
  lens,
  layout,
  onPress,
  onLayout,
}: {
  link: (typeof landingNavigation)[number];
  active: boolean;
  menu?: boolean;
  lens: GlassLensController;
  layout?: GlassLensTarget;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const interaction = useGlassInteraction();
  const magnify = useLensMagnify(lens, layout, 'x');

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: GlassMotion.travel.duration,
      easing: GlassMotion.travel.easing,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const scale = useMemo(
    () =>
      Animated.multiply(
        interaction.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }),
        menu ? 1 : (magnify ?? 1),
      ),
    [interaction.press, magnify, menu],
  );

  return (
    <Animated.View
      onLayout={onLayout}
      style={[menu ? styles.menuLinkWrap : styles.linkWrap, { transform: [{ scale }] }]}>
      <Pressable
        style={menu ? styles.menuLink : styles.link}
        onPress={onPress}
        onHoverIn={interaction.handlers.onHoverIn}
        onHoverOut={interaction.handlers.onHoverOut}
        onPressIn={interaction.handlers.onPressIn}
        onPressOut={interaction.handlers.onPressOut}>
        {!menu && (
          <GlassMaterial
            variant="chip"
            radius={DefaultTheme.radius.pill}
            blurEnabled={false}
            interaction={interaction}
            sheen
            style={[
              styles.linkLens,
              {
                opacity: interaction.energy.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.85],
                }),
              },
            ]}
          />
        )}
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
    zIndex: 30,
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
    position: 'relative',
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenMobileBrand: {
    display: 'none',
  },
  mobileLink: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    borderRadius: DefaultTheme.radius.lg,
  },
  mobileLinkContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mobileIconShell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  navbar: {
    width: '100%',
    maxWidth: DefaultTheme.layout.contentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  desktopReflection: {
    left: 40,
    right: 40,
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
  linkLens: {
    top: 13,
    bottom: 13,
    left: -14,
    right: -14,
  },
  linkText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 12,
    height: 2.5,
    borderRadius: 3,
    backgroundColor: DefaultTheme.colors.primary,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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
