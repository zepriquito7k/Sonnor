import { useWindowDimensions } from "react-native";

const baseWidth = 390;
const baseHeight = 844;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const wp = (percent: number): number => (width * percent) / 100;
  const hp = (percent: number): number => (height * percent) / 100;

  const scale = (size: number): number => (width / baseWidth) * size;
  const verticalScale = (size: number): number => (height / baseHeight) * size;

  const font = (size: number): number => size + (scale(size) - size) * 0.5;

  return { wp, hp, scale, verticalScale, font };
};
