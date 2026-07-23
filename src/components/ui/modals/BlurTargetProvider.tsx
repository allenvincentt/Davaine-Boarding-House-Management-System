import { BlurTargetView } from 'expo-blur';
import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const blurTargetRef = useRef<View | null>(null);

  return (
    <BlurTargetContext.Provider value={blurTargetRef}>
      <BlurTargetView ref={blurTargetRef} style={styles.fill}>
        {children}
      </BlurTargetView>
    </BlurTargetContext.Provider>
  );
}

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
