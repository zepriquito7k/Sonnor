import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

type LinearSeekBarProps = {
  maximumTrackColor?: string;
  minimumTrackColor?: string;
  onSlidingComplete?: (value: number) => void;
  onSlidingStart?: (value: number) => void;
  onValueChange?: (value: number) => void;
  style?: ViewStyle;
  trackHeight?: number;
  value: number;
};

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export default function LinearSeekBar({
  maximumTrackColor = "rgba(255,255,255,0.3)",
  minimumTrackColor = "#fff",
  onSlidingComplete,
  onSlidingStart,
  onValueChange,
  style,
  trackHeight = 6,
  value,
}: LinearSeekBarProps) {
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const activeAnim = useRef(new Animated.Value(0)).current;
  const [dragValue, setDragValue] = useState<number | null>(null);
  const valueRef = useRef(clamp(value));
  const onSlidingCompleteRef = useRef(onSlidingComplete);
  const onSlidingStartRef = useRef(onSlidingStart);
  const onValueChangeRef = useRef(onValueChange);
  valueRef.current = dragValue ?? clamp(value);
  onSlidingCompleteRef.current = onSlidingComplete;
  onSlidingStartRef.current = onSlidingStart;
  onValueChangeRef.current = onValueChange;

  function valueFromEvent(event: GestureResponderEvent) {
    return trackWidthRef.current > 0
      ? clamp(
          (event.nativeEvent.pageX - trackPageXRef.current) /
            trackWidthRef.current,
        )
      : valueRef.current;
  }

  function measureTrack() {
    trackRef.current?.measureInWindow((pageX, _pageY, measuredWidth) => {
      trackPageXRef.current = pageX;
      trackWidthRef.current = measuredWidth;
    });
  }

  function animateActive(active: boolean) {
    Animated.spring(activeAnim, {
      damping: 18,
      mass: 0.55,
      stiffness: 240,
      toValue: active ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }

  function updateValue(event: GestureResponderEvent) {
    const nextValue = valueFromEvent(event);
    setDragValue(nextValue);
    onValueChangeRef.current?.(nextValue);
    return nextValue;
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        measureTrack();
        animateActive(true);
        void Haptics.selectionAsync().catch(() => null);
        const nextValue = updateValue(event);
        onSlidingStartRef.current?.(nextValue);
      },
      onPanResponderMove: (event) => {
        updateValue(event);
      },
      onPanResponderRelease: (event) => {
        const nextValue = valueFromEvent(event);
        setDragValue(null);
        animateActive(false);
        onSlidingCompleteRef.current?.(nextValue);
      },
      onPanResponderTerminate: (event) => {
        const nextValue = valueFromEvent(event);
        setDragValue(null);
        animateActive(false);
        onSlidingCompleteRef.current?.(nextValue);
      },
      onStartShouldSetPanResponder: () => true,
    }),
  ).current;

  useEffect(() => {
    measureTrack();
  }, []);

  const animatedTrackHeight = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [trackHeight, trackHeight + 3],
  });
  return (
    <View
      ref={trackRef}
      {...panResponder.panHandlers}
      onLayout={(event) => {
        trackWidthRef.current = event.nativeEvent.layout.width;
        measureTrack();
      }}
      style={[styles.touchArea, style]}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: maximumTrackColor, height: animatedTrackHeight },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: minimumTrackColor,
              height: animatedTrackHeight,
              width: `${valueRef.current * 100}%`,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: 999,
  },
  touchArea: {
    justifyContent: "center",
    minHeight: 30,
    width: "100%",
  },
  track: {
    borderRadius: 999,
    overflow: "hidden",
    width: "100%",
  },
});
