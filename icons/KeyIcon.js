import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

export default function KeyIcon({ size = 22, color = "#8f8f99" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="7" cy="12" r="3" stroke={color} strokeWidth="2" fill="none" />
      <Path
        d="M10 12h9m-3 0v4m0-4v-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
