import { BlurView } from 'expo-blur';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useBlurTarget } from '@/components/ui/modals/BlurTargetProvider';
import { DefaultTheme } from '@/constants/defaultTheme';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
};

type FocusedFieldTarget = number | (object & { scrollIntoView?: (options?: unknown) => void });

type ModalKeyboardContextValue = {
  focusField: (target: FocusedFieldTarget | null | undefined) => void;
};

type ScrollResponderHandle = {
  scrollResponderScrollNativeHandleToKeyboard?: (
    target: FocusedFieldTarget,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean,
  ) => void;
};

const ModalKeyboardContext = createContext<ModalKeyboardContextValue | null>(null);

const FIELD_SCROLL_OFFSET = 16;

export function useModalKeyboardFocus(): ModalKeyboardContextValue['focusField'] | null {
  const context = useContext(ModalKeyboardContext);
  return context ? context.focusField : null;
}

const OPEN_DURATION = 240;
const CLOSE_DURATION = 180;
const RESIZE_DURATION = 220;

export function Modal({
  visible,
  onClose,
  children,
  contentStyle,
  dismissOnBackdropPress = true,
}: ModalProps) {
  const blurTarget = useBlurTarget();
  const [mounted, setMounted] = useState(false);
  const [heightReady, setHeightReady] = useState(false);
  const hasMeasuredHeight = useRef(false);
  const hasOpenedRef = useRef(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.94)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;
  const contentHeight = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const lastFocusedFieldRef = useRef<FocusedFieldTarget | null>(null);
  const [webKeyboardInset, setWebKeyboardInset] = useState(0);

  const focusField = useCallback((target: FocusedFieldTarget | null | undefined) => {
    if (target == null) {
      return;
    }
    lastFocusedFieldRef.current = target;

    if (Platform.OS === 'web') {
      if (typeof target !== 'number') {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    (scrollViewRef.current as unknown as ScrollResponderHandle | null)
      ?.scrollResponderScrollNativeHandleToKeyboard?.(target, FIELD_SCROLL_OFFSET, true);
  }, []);

  const keyboardContextValue = useMemo<ModalKeyboardContextValue>(
    () => ({ focusField }),
    [focusField],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      const inset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop));
      setWebKeyboardInset(inset);

      const lastFocused = lastFocusedFieldRef.current;
      if (inset > 0 && lastFocused != null && typeof lastFocused !== 'number') {
        lastFocused.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
    };

    viewport.addEventListener('resize', handleViewportResize);
    return () => viewport.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    if (visible) {
      hasOpenedRef.current = true;

      hasMeasuredHeight.current = false;
      setHeightReady(false);
      setMounted(true);
      backdropOpacity.setValue(1);
      contentOpacity.setValue(0);
      contentScale.setValue(0.94);
      contentTranslateY.setValue(18);

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    if (!hasOpenedRef.current) {
      return;
    }

    let finalized = false;
    const finalizeClose = () => {
      if (finalized) {
        return;
      }
      finalized = true;
      hasOpenedRef.current = false;
      setMounted(false);
    };

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(contentScale, {
        toValue: 0.96,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 12,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(finalizeClose);

    const fallbackTimeout = setTimeout(finalizeClose, CLOSE_DURATION + 120);

    return () => clearTimeout(fallbackTimeout);
  }, [visible, backdropOpacity, contentOpacity, contentScale, contentTranslateY]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;

    if (!hasMeasuredHeight.current) {
      hasMeasuredHeight.current = true;
      contentHeight.setValue(nextHeight);
      setHeightReady(true);
      return;
    }

    Animated.timing(contentHeight, {
      toValue: nextHeight,
      duration: RESIZE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  if (!mounted) {
    return null;
  }

  return (
    <RNModal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            tint="dark"
            intensity={22}
            blurTarget={blurTarget ?? undefined}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdropPress ? onClose : undefined}
            accessibilityRole={dismissOnBackdropPress ? 'button' : undefined}
            accessibilityLabel={dismissOnBackdropPress ? 'Close' : undefined}
          />
        </Animated.View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.keyboardAvoider}
            contentContainerStyle={[
              styles.scrollContent,
              webKeyboardInset > 0 ? { paddingBottom: webKeyboardInset } : null,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            pointerEvents="box-none">
            <Animated.View
              style={[
                styles.contentShell,
                contentStyle,
                heightReady ? { height: contentHeight } : null,
                {
                  opacity: contentOpacity,
                  transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
                },
              ]}>
              <View onLayout={handleContentLayout} style={styles.contentInner}>
                <ModalKeyboardContext.Provider value={keyboardContextValue}>
                  {children}
                </ModalKeyboardContext.Provider>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: DefaultTheme.spacing.lg,
  },
  contentShell: {
    width: '100%',
    maxWidth: 420,
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: DefaultTheme.radius.lg,
    backgroundColor: DefaultTheme.colors.white,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  contentInner: {
    width: '100%',
  },
});
