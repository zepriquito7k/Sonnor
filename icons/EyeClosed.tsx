import React from "react";
import Svg, { Line, Path } from "react-native-svg";

export default function EyeClosed({ size = 22, color = "#FFFFFF" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C3.73 8.11 8 5 12 5C16 5 20.27 8.11 22 12C20.27 15.89 16 19 12 19C8 19 3.73 15.89 2 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1="4"
        y1="4"
        x2="20"
        y2="20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
