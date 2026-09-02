import { TextStyle } from "react-native";
import { colors } from "./colors";

export const typography = {
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
    lineHeight: 30,
  } as TextStyle,
  screenTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.3,
  } as TextStyle,
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  } as TextStyle,
  body: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text.secondary,
    lineHeight: 20,
  } as TextStyle,
  bodyBold: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text.muted,
  } as TextStyle,
  captionBold: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  } as TextStyle,
};
