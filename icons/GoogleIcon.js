import React from "react";
import Svg, { Text as SvgText } from "react-native-svg";

export default function GoogleIcon({ size = 22, color = "#FFFFFF" }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32" // espaço interno maior
    >
      <SvgText
        x="50%"
        y="50%"
        fill={color}
        fontSize={30} // tamanho do G (aumenta/diminui se quiseres)
        fontWeight="400" // mais “gordinho”
        textAnchor="middle" // centra na horizontal
        alignmentBaseline="middle" // centra na vertical
      >
        G
      </SvgText>
    </Svg>
  );
}
