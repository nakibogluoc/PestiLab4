const COMMON = {
  fontFamily: "'Inter','Helvetica',Arial,sans-serif",
  qrSize: 24,            // mm
  barcodeHeight: 12,     // mm
  barcodeFormat: "CODE128",
  qrECC: "M",
  showBorders: false,
  density: 203,          // 203 or 300 DPI
  scale: 1.0,            // fine calibration (1.02 = +2%)
};

export const LABEL_PROFILES = {
  "Zebra_40x20_203": { id:"Zebra_40x20_203", displayName:"Zebra 40×20 mm (203dpi)",
    width:40, height:20, margin:{top:1,right:1,bottom:1,left:1}, density:203, ...COMMON },
  "Zebra_50x25_203": { id:"Zebra_50x25_203", displayName:"Zebra 50×25 mm (203dpi)",
    width:50, height:25, margin:{top:1,right:1,bottom:1,left:1}, density:203, ...COMMON },
  "Zebra_58x40_300": { id:"Zebra_58x40_300", displayName:"Zebra 58×40 mm (300dpi)",
    width:58, height:40, margin:{top:1.5,right:1.5,bottom:1.5,left:1.5}, density:300, ...COMMON, qrSize:26, barcodeHeight:14 },
  "TSC_40x30_203": { id:"TSC_40x30_203", displayName:"TSC 40×30 mm (203dpi)",
    width:40, height:30, margin:{top:1,right:1,bottom:1,left:1}, density:203, ...COMMON },
  "Godex_60x40_203": { id:"Godex_60x40_203", displayName:"Godex 60×40 mm (203dpi)",
    width:60, height:40, margin:{top:2,right:2,bottom:2,left:2}, density:203, ...COMMON, qrSize:28, barcodeHeight:16 },
  "Generic_70x50_300": { id:"Generic_70x50_300", displayName:"Generic 70×50 mm (300dpi)",
    width:70, height:50, margin:{top:2,right:2,bottom:2,left:2}, density:300, ...COMMON, qrSize:30, barcodeHeight:18 },
  // A4 sheets (bulk)
  "A4_3x8_63.5x38.1": { id:"A4_3x8_63.5x38.1", displayName:"A4 3×8 (63.5×38.1 mm)",
    page:{width:210,height:297}, grid:{rows:8,cols:3,gutterX:2.5,gutterY:0},
    label:{width:63.5,height:38.1,margin:0}, density:300, ...COMMON, qrSize:22, barcodeHeight:14 },
  "A4_2x7_99.1x67.7": { id:"A4_2x7_99.1x67.7", displayName:"A4 2×7 (99.1×67.7 mm)",
    page:{width:210,height:297}, grid:{rows:7,cols:2,gutterX:2.5,gutterY:0},
    label:{width:99.1,height:67.7,margin:0}, density:300, ...COMMON, qrSize:26, barcodeHeight:16 },
  // Example with slight calibration
  "Zebra_50x25_203_cal102": { id:"Zebra_50x25_203_cal102", displayName:"Zebra 50×25 mm (203dpi, +2% scale)",
    width:50, height:25, margin:{top:1,right:1,bottom:1,left:1}, density:203, ...COMMON, scale:1.02 },
};

export const DEFAULT_PROFILE_ID = "Zebra_50x25_203";
