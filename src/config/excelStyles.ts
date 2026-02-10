export const EXCEL_STYLES = {
  FONT: {
    NAME: "Arial",
    SIZE: 10,
    COLOR_DEFAULT: { argb: "FF000000" }, // Black
    COLOR_BLUE: { argb: "FF0000FF" }, // Blue for vars
    COLOR_GREEN: { argb: "FF008000" }, // 200 Status
    COLOR_RED: { argb: "FFFF0000" }, // 400 Status
    COLOR_YELLOW: { argb: "FFEECD00" }, // 500 Status
  },
  BORDER: {
    THIN: "thin",
    DOUBLE: "double",
  },
  ALIGNMENT: {
    DEFAULT: { vertical: "top", wrapText: true },
    CENTER: { vertical: "top", wrapText: true, horizontal: "center" },
    RIGHT: { vertical: "top", wrapText: true, horizontal: "right" },
  },

} as const;
