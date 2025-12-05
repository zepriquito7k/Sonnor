import React from "react";
import Svg, { Path } from "react-native-svg";

export default function MailIcon({ size = 22, color = "#888" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 500 500" fill="none">
      <Path
        d="M25 100C25 77.9 42.9 60 65 60H435C457.1 60 475 77.9 475 100V400C475 422.1 457.1 440 435 440H65C42.9 440 25 422.1 25 400V100Z"
        stroke={color}
        strokeWidth="40"
        strokeLinejoin="round"
      />
      <Path
        d="M50 120L250 280L450 120"
        stroke={color}
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
