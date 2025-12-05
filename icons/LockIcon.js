import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

export default function LockIcon({ size = 22, color = "#888" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 500 500" fill="none">
      {/* Corpo do cadeado */}
      <Path
        d="M100 220H400C433 220 460 247 460 280V430C460 463 433 490 400 490H100C67 490 40 463 40 430V280C40 247 67 220 100 220Z"
        stroke={color}
        strokeWidth={40}
        strokeLinejoin="round"
      />

      {/* Parte de cima (arco) */}
      <Path
        d="M150 220V150C150 90 200 40 250 40C300 40 350 90 350 150V220"
        stroke={color}
        strokeWidth={40}
        strokeLinecap="round"
      />

      {/* Buraco da chave */}
      <Circle cx="250" cy="330" r="35" fill={color} />
    </Svg>
  );
}
