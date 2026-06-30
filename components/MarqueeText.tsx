import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type StyleProp,
  StyleSheet as RNStyleSheet,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
} from "react-native";

type MarqueeTextProps = TextProps & {
  children: React.ReactNode;
  initialPauseMs?: number;
  pauseMs?: number;
  pxPerSecond?: number;
  style?: StyleProp<TextStyle>;
};

export default function MarqueeText({
  children,
  initialPauseMs = 3000,
  pauseMs = 650,
  pxPerSecond = 48,
  style,
  ...textProps
}: MarqueeTextProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const textValue = useMemo(() => {
    if (typeof children === "string" || typeof children === "number") {
      return String(children);
    }

    return "";
  }, [children]);
  const flatStyle = RNStyleSheet.flatten(style);
  const fontSize = typeof flatStyle?.fontSize === "number" ? flatStyle.fontSize : 16;
  const estimatedTextWidth = textValue.length * fontSize * 0.62;
  const measuredTextWidth = Math.max(textWidth, estimatedTextWidth);
  const overflow = Math.max(0, measuredTextWidth - containerWidth);

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);

    if (overflow <= 1) {
      return;
    }

    const duration = Math.max(900, (overflow / pxPerSecond) * 1000);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(initialPauseMs),
        Animated.timing(translateX, {
          duration,
          easing: Easing.inOut(Easing.quad),
          toValue: -overflow,
          useNativeDriver: true,
        }),
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          duration,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [initialPauseMs, overflow, pauseMs, pxPerSecond, translateX]);

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.Text
        {...textProps}
        ellipsizeMode="clip"
        numberOfLines={1}
        style={[
          style,
          overflow > 1 ? styles.animatedText : null,
          overflow > 1 ? { width: measuredTextWidth } : styles.staticText,
          { transform: [{ translateX }] },
        ]}
      >
        {children}
      </Animated.Text>
      <Text
        {...textProps}
        ellipsizeMode="clip"
        numberOfLines={1}
        onLayout={(event) => setTextWidth(Math.ceil(event.nativeEvent.layout.width))}
        style={[style, styles.measureText]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    width: "100%",
  },
  animatedText: {
    alignSelf: "flex-start",
  },
  staticText: {
    width: "100%",
  },
  measureText: {
    alignSelf: "flex-start",
    left: -10000,
    opacity: 0,
    position: "absolute",
  },
});
