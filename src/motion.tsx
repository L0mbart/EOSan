import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type ViewStyle } from 'react-native';

const webEase = {
  transitionDuration: '300ms',
  transitionProperty: 'background-color, color, border-color, opacity',
  transitionTimingFunction: 'ease-out',
} as ViewStyle;

export const cardLift: ViewStyle = Platform.OS === 'web'
  ? { boxShadow: '0 8px 24px rgba(16, 32, 51, 0.06)' }
  : {
      shadowColor: '#102033',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    };

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return reduce;
}

export function useEase(): ViewStyle {
  const reduce = useReducedMotion();
  if (reduce || Platform.OS !== 'web') return {};
  return webEase;
}

export function FadeIn({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [id, opacity, reduce]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

function prefersReducedMotion(): boolean {
  return Platform.OS === 'web'
    && typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
