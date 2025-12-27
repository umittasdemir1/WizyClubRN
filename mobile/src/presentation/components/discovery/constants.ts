import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const ICON_BTN_WIDTH = 50;
export const EXPAND_BTN_WIDTH = width * 0.65; // ~2/3 of screen width for the tabs pill
