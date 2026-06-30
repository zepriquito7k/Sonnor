import type { PressableStateCallbackType, StyleProp, ViewStyle } from "react-native";

const pressedFeedback: ViewStyle = {
  opacity: 0.68,
  transform: [{ scale: 0.985 }],
};

export function pressableFeedback(style: StyleProp<ViewStyle>) {
  return ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    style,
    pressed ? pressedFeedback : null,
  ];
}
