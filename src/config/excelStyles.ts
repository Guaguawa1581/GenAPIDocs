export const EXCEL_STYLES = {
  FONT: {
    NAME: "Arial",
    SIZE: 10,
    COLOR_DEFAULT: { argb: "FF000000" },
    COLOR_BLUE: { argb: "FF4285F4" },
    COLOR_GREEN: { argb: "FF34A853" },
    COLOR_RED: { argb: "FFEA4335" },
    COLOR_YELLOW: { argb: "FFFBBC04" },
  },
  BORDER: {
    THIN: "thin",
    DOUBLE: "double",
  },
  ALIGNMENT: {
    DEFAULT: { vertical: "middle", wrapText: true },
    CENTER: { vertical: "middle", wrapText: true, horizontal: "center" },
    RIGHT: { vertical: "middle", wrapText: true, horizontal: "right" },
    TOP_LEFT: { vertical: "top", wrapText: true, horizontal: "left" },
  },
} as const;
