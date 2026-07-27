import { BlurView } from "expo-blur";
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppIcon } from "@/components/ui/AppIcon";
import { MatchaButton } from "@/components/ui/buttons/MatchaButton";
import { useBlurTarget } from "@/components/ui/modals/BlurTargetProvider";
import { DefaultTheme } from "@/constants/defaultTheme";
import { Gradient } from "@/constants/gradient";
import type { AppIconName } from "@/constants/icons";

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
};

type FocusedFieldTarget =
  | number
  | (object & { scrollIntoView?: (options?: unknown) => void });

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

const ModalKeyboardContext = createContext<ModalKeyboardContextValue | null>(
  null,
);

const FIELD_SCROLL_OFFSET = 16;

export function useModalKeyboardFocus():
  | ModalKeyboardContextValue["focusField"]
  | null {
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
  const [resizing, setResizing] = useState(false);
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

  const focusField = useCallback(
    (target: FocusedFieldTarget | null | undefined) => {
      if (target == null) {
        return;
      }
      lastFocusedFieldRef.current = target;

      if (Platform.OS === "web") {
        if (typeof target !== "number") {
          target.scrollIntoView?.({ behavior: "smooth", block: "center" });
        }
        return;
      }

      (
        scrollViewRef.current as unknown as ScrollResponderHandle | null
      )?.scrollResponderScrollNativeHandleToKeyboard?.(
        target,
        FIELD_SCROLL_OFFSET,
        true,
      );
    },
    [],
  );

  const keyboardContextValue = useMemo<ModalKeyboardContextValue>(
    () => ({ focusField }),
    [focusField],
  );

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      !window.visualViewport
    ) {
      return;
    }

    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      const inset = Math.max(
        0,
        window.innerHeight - (viewport.height + viewport.offsetTop),
      );
      setWebKeyboardInset(inset);

      const lastFocused = lastFocusedFieldRef.current;
      if (inset > 0 && lastFocused != null && typeof lastFocused !== "number") {
        lastFocused.scrollIntoView?.({ behavior: "smooth", block: "center" });
      }
    };

    viewport.addEventListener("resize", handleViewportResize);
    return () => viewport.removeEventListener("resize", handleViewportResize);
  }, []);

  useEffect(() => {
    if (visible) {
      hasOpenedRef.current = true;

      hasMeasuredHeight.current = false;
      setResizing(false);
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
  }, [
    visible,
    backdropOpacity,
    contentOpacity,
    contentScale,
    contentTranslateY,
  ]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;

    if (!hasMeasuredHeight.current) {
      hasMeasuredHeight.current = true;
      contentHeight.setValue(nextHeight);
      return;
    }

    setResizing(true);
    Animated.timing(contentHeight, {
      toValue: nextHeight,
      duration: RESIZE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setResizing(false);
      }
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <RNModal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            tint="dark"
            intensity={22}
            blurTarget={blurTarget ?? undefined}
            blurMethod={
              Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : undefined
            }
          />
        </Animated.View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          pointerEvents="box-none"
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.keyboardAvoider}
            contentContainerStyle={[
              styles.scrollContent,
              webKeyboardInset > 0 ? { paddingBottom: webKeyboardInset } : null,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {dismissOnBackdropPress && (
              <Pressable
                style={styles.dismissLayer}
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
              />
            )}
            <Animated.View
              style={[
                styles.contentShell,
                contentStyle,
                resizing ? { height: contentHeight } : null,
                {
                  opacity: contentOpacity,
                  transform: [
                    { translateY: contentTranslateY },
                    { scale: contentScale },
                  ],
                },
              ]}
            >
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

export type StepperStep = {
  key: string;
  label: string;
  caption?: string;
  icon?: AppIconName;
  content: ReactNode;
};

type StepperModalProps = {
  visible: boolean;
  onClose: () => void;
  steps: StepperStep[];
  step: number;
  onStepChange: (index: number) => void;
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  error?: string | null;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
};

const STEPPER_HORIZONTAL_WIDTH = 720;
const SLIDE_OUT_DURATION = 130;
const SLIDE_IN_DURATION = 210;
const SLIDE_DISTANCE = 30;
const PANEL_DURATION = 260;
const TRACK_BULLET = 46;
const RAIL_BULLET = 40;

type GradientStyle = ViewStyle & {
  experimental_backgroundImage?: string;
  backgroundImage?: string;
};

function gradientLayer(image: string): GradientStyle {
  return Platform.OS === "web"
    ? { backgroundImage: image }
    : { experimental_backgroundImage: image };
}

export function StepperModal({
  visible,
  onClose,
  steps,
  step,
  onStepChange,
  title,
  subtitle,
  icon,
  error,
  submitLabel,
  submitting = false,
  onSubmit,
  contentStyle,
  dismissOnBackdropPress = true,
}: StepperModalProps) {
  const { width } = useWindowDimensions();
  const horizontal = width >= STEPPER_HORIZONTAL_WIDTH;

  const lastIndex = Math.max(steps.length - 1, 0);
  const current = Math.min(Math.max(step, 0), lastIndex);
  const isLast = current === lastIndex;

  const [rendered, setRendered] = useState(current);
  const [collapsedStep, setCollapsedStep] = useState<number | null>(null);
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      return;
    }
    setRendered(current);
    setCollapsedStep(null);
    slide.setValue(0);
    fade.setValue(1);
  }, [visible, current, slide, fade]);

  useEffect(() => {
    if (!visible || current === rendered) {
      return;
    }

    if (!horizontal) {
      setRendered(current);
      return;
    }

    const direction = current > rendered ? 1 : -1;

    Animated.parallel([
      Animated.timing(slide, {
        toValue: -direction * SLIDE_DISTANCE,
        duration: SLIDE_OUT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: SLIDE_OUT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setRendered(current);
      slide.setValue(direction * SLIDE_DISTANCE);
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: SLIDE_IN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: SLIDE_IN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [visible, current, rendered, horizontal, slide, fade]);

  const goTo = useCallback(
    (next: number) => {
      if (submitting) {
        return;
      }
      setCollapsedStep(null);
      onStepChange(Math.min(Math.max(next, 0), lastIndex));
    },
    [submitting, lastIndex, onStepChange],
  );

  const toggle = useCallback(
    (next: number) => {
      if (submitting) {
        return;
      }
      if (next === current) {
        setCollapsedStep((value) => (value === next ? null : next));
        return;
      }
      goTo(next);
    },
    [submitting, current, goTo],
  );

  const activeStep = steps[Math.min(rendered, lastIndex)];

  return (
    <Modal
      visible={visible}
      onClose={submitting ? () => undefined : onClose}
      dismissOnBackdropPress={dismissOnBackdropPress && !submitting}
      contentStyle={contentStyle}
    >
      <View style={[stepperStyles.body, !horizontal && stepperStyles.bodyCompact]}>
        <View style={stepperStyles.header}>
          {!!icon && (
            <View style={stepperStyles.headerBadge}>
              <AppIcon name={icon} size={20} tintColor={DefaultTheme.colors.primary} />
            </View>
          )}
          <View style={stepperStyles.headerText}>
            <Text style={stepperStyles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && <Text style={stepperStyles.subtitle}>{subtitle}</Text>}
          </View>
          <View style={stepperStyles.counter}>
            <Text style={stepperStyles.counterText}>
              {current + 1}/{steps.length}
            </Text>
          </View>
        </View>

        {horizontal ? (
          <>
            <View style={stepperStyles.track}>
              {steps.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 && (
                    <View style={stepperStyles.connector}>
                      {index <= current && (
                        <View
                          pointerEvents="none"
                          style={[
                            StyleSheet.absoluteFill,
                            gradientLayer(Gradient.base),
                          ]}
                        />
                      )}
                    </View>
                  )}
                  <TrackStep
                    index={index}
                    current={current}
                    count={steps.length}
                    step={item}
                    disabled={submitting}
                    onPress={() => goTo(index)}
                  />
                </Fragment>
              ))}
            </View>

            <Animated.View
              style={[
                stepperStyles.slide,
                { opacity: fade, transform: [{ translateX: slide }] },
              ]}
            >
              {!!activeStep?.caption && (
                <Text style={stepperStyles.stepCaption}>{activeStep.caption}</Text>
              )}
              {activeStep?.content}
            </Animated.View>
          </>
        ) : (
          <View style={stepperStyles.rail}>
            {steps.map((item, index) => (
              <StepRow
                key={item.key}
                index={index}
                current={current}
                count={steps.length}
                step={item}
                expanded={index === current && collapsedStep !== index}
                last={index === steps.length - 1}
                disabled={submitting}
                onPress={() => toggle(index)}
              />
            ))}
          </View>
        )}

        {!!error && <Text style={stepperStyles.error}>{error}</Text>}

        <View style={stepperStyles.actions}>
          <MatchaButton
            label={current === 0 ? "Cancel" : "Back"}
            variant="outline"
            disabled={submitting}
            style={stepperStyles.action}
            onPress={current === 0 ? onClose : () => goTo(current - 1)}
          />
          <MatchaButton
            label={isLast ? submitLabel : "Next"}
            disabled={submitting}
            style={stepperStyles.action}
            onPress={isLast ? onSubmit : () => goTo(current + 1)}
          />
        </View>
      </View>
    </Modal>
  );
}

function StepBullet({
  index,
  current,
  icon,
  size,
  iconSize,
  highlighted = false,
}: {
  index: number;
  current: number;
  icon?: AppIconName;
  size: number;
  iconSize: number;
  highlighted?: boolean;
}) {
  const done = index < current;
  const active = index === current;
  const image = active ? Gradient.base : done ? Gradient.pressed : Gradient.soft;
  const tint =
    active || done ? DefaultTheme.colors.white : DefaultTheme.colors.muted;

  return (
    <View
      style={[
        stepperStyles.bullet,
        { width: size, height: size, borderRadius: size / 2 },
        done && stepperStyles.bulletDone,
        active && stepperStyles.bulletActive,
        highlighted && !active && stepperStyles.bulletHighlighted,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2 },
          gradientLayer(image),
        ]}
      />
      {done ? (
        <AppIcon name="check" size={iconSize} tintColor={tint} />
      ) : icon ? (
        <AppIcon name={icon} size={iconSize} tintColor={tint} />
      ) : (
        <Text style={[stepperStyles.bulletText, active && stepperStyles.bulletTextActive]}>
          {index + 1}
        </Text>
      )}
    </View>
  );
}

function TrackStep({
  index,
  current,
  count,
  step,
  disabled,
  onPress,
}: {
  index: number;
  current: number;
  count: number;
  step: StepperStep;
  disabled: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = index === current;
  const reached = index <= current;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`Step ${index + 1} of ${count}: ${step.label}`}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      style={stepperStyles.trackStep}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      <StepBullet
        index={index}
        current={current}
        icon={step.icon}
        size={TRACK_BULLET}
        iconSize={20}
        highlighted={hovered}
      />
      <Text
        style={[
          stepperStyles.trackLabel,
          (reached || hovered) && stepperStyles.trackLabelReached,
          active && stepperStyles.trackLabelActive,
        ]}
        numberOfLines={2}
      >
        {step.label}
      </Text>
    </Pressable>
  );
}

function StepRow({
  index,
  current,
  count,
  step,
  expanded,
  last,
  disabled,
  onPress,
}: {
  index: number;
  current: number;
  count: number;
  step: StepperStep;
  expanded: boolean;
  last: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(RAIL_BULLET);
  const [settled, setSettled] = useState(expanded);
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    setSettled(false);
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: PANEL_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        setSettled(true);
      }
    });

    return () => animation.stop();
  }, [expanded, progress]);

  const measured = contentHeight > 0;
  const panelHeight =
    expanded && settled
      ? undefined
      : measured
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] })
        : expanded
          ? undefined
          : 0;

  return (
    <View style={[stepperStyles.railRow, last && stepperStyles.railRowLast]}>
      {!last && (
        <View
          pointerEvents="none"
          style={[
            stepperStyles.railLine,
            { top: (headerHeight + RAIL_BULLET) / 2 + 6 },
          ]}
        >
          {index < current && (
            <View style={[StyleSheet.absoluteFill, gradientLayer(Gradient.base)]} />
          )}
        </View>
      )}

      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={`Step ${index + 1} of ${count}: ${step.label}`}
        accessibilityState={{ selected: expanded, expanded, disabled }}
        disabled={disabled}
        style={({ pressed }) => [
          stepperStyles.railHeader,
          pressed && stepperStyles.railHeaderPressed,
        ]}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          setHeaderHeight((value) => (value === next ? value : next));
        }}
        onPress={onPress}
      >
        <StepBullet
          index={index}
          current={current}
          icon={step.icon}
          size={RAIL_BULLET}
          iconSize={18}
        />
        <View style={stepperStyles.railHeaderText}>
          <Text
            style={[stepperStyles.railLabel, expanded && stepperStyles.railLabelActive]}
            numberOfLines={1}
          >
            {step.label}
          </Text>
          {!!step.caption && (
            <Text style={stepperStyles.railCaption} numberOfLines={expanded ? 3 : 2}>
              {step.caption}
            </Text>
          )}
        </View>
        <Animated.View
          style={{
            transform: [
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <AppIcon name="chevronDown" size={14} tintColor={DefaultTheme.colors.muted} />
        </Animated.View>
      </Pressable>

      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        style={[
          stepperStyles.railPanel,
          { opacity: progress, height: panelHeight },
        ]}
      >
        <View
          onLayout={(event) => {
            const next = Math.ceil(event.nativeEvent.layout.height);
            setContentHeight((value) => (value === next ? value : next));
          }}
          style={stepperStyles.railPanelContent}
        >
          {step.content}
        </View>
      </Animated.View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  body: {
    padding: DefaultTheme.spacing.lg,
  },
  bodyCompact: {
    paddingHorizontal: DefaultTheme.spacing.md,
    paddingTop: 18,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 17,
  },
  subtitle: {
    marginTop: 3,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  counter: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  counterText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11,
  },
  track: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  trackStep: {
    flex: 1.6,
    alignItems: "center",
    gap: 9,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  trackLabel: {
    textAlign: "center",
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  trackLabelReached: {
    color: DefaultTheme.colors.ink,
  },
  trackLabelActive: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
  connector: {
    flex: 1,
    height: 3,
    minWidth: 12,
    marginTop: TRACK_BULLET / 2 - 1.5,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: DefaultTheme.colors.line,
  },
  bullet: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
  },
  bulletDone: {
    borderColor: "rgba(110, 122, 0, 0.9)",
  },
  bulletActive: {
    borderColor: DefaultTheme.colors.primary,
    shadowColor: "#2C2C24",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bulletHighlighted: {
    borderColor: DefaultTheme.colors.primary,
  },
  bulletText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
  },
  bulletTextActive: {
    color: DefaultTheme.colors.white,
  },
  slide: {
    marginTop: 20,
  },
  stepCaption: {
    marginBottom: 12,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  rail: {
    marginTop: 18,
  },
  railRow: {
    position: "relative",
    paddingBottom: 14,
  },
  railRowLast: {
    paddingBottom: 0,
  },
  railLine: {
    position: "absolute",
    left: (RAIL_BULLET - 3) / 2,
    bottom: 4,
    width: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: DefaultTheme.colors.line,
  },
  railHeader: {
    minHeight: RAIL_BULLET,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 4,
    borderRadius: DefaultTheme.radius.md,
  },
  railHeaderPressed: {
    backgroundColor: DefaultTheme.colors.cool,
  },
  railHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  railLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 14,
  },
  railLabelActive: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
  railCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  railPanel: {
    marginLeft: RAIL_BULLET + 12,
    overflow: "hidden",
  },
  railPanelContent: {
    paddingTop: 12,
    paddingBottom: 2,
  },
  error: {
    marginTop: 16,
    color: "#D64545",
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  actions: {
    marginTop: 24,
    flexDirection: "row",
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: DefaultTheme.spacing.lg,
  },
  dismissLayer: {
    position: "absolute",
    top: -DefaultTheme.spacing.lg,
    left: -DefaultTheme.spacing.lg,
    right: -DefaultTheme.spacing.lg,
    bottom: -DefaultTheme.spacing.lg,
  },
  contentShell: {
    width: "100%",
    maxWidth: 420,
    zIndex: 1,
    overflow: "hidden",
    borderRadius: DefaultTheme.radius.lg,
    backgroundColor: DefaultTheme.colors.white,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  contentInner: {
    width: "100%",
  },
});
