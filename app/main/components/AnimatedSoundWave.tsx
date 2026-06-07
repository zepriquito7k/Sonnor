import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const BAR_DURATIONS = [280, 390, 320, 430];

export default function AnimatedSoundWave({
  color = "#fff",
}: {
  color?: string;
}) {
  const bars = useRef(
    BAR_DURATIONS.map(() => new Animated.Value(0.35)),
  ).current;

  useEffect(() => {
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: BAR_DURATIONS[index],
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.35,
            duration: BAR_DURATIONS[(index + 1) % BAR_DURATIONS.length],
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [bars]);

  return (
    <View style={styles.root}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
});
