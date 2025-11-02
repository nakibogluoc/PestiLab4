import React from "react";
import JsBarcode from "jsbarcode";
import { QRCodeCanvas } from "qrcode.react";
import { formatNumber } from "../utils/formatNumber";

function mmToPx(mm, dpi, scale=1) { return Math.round((mm/25.4)*dpi*scale); }

export default function LabelCard({ data, profile }) {
  const {
    width, height, margin={top:0,right:0,bottom:0,left:0},
    density=203, scale=1, fontFamily,
    barcodeFormat="CODE128", barcodeHeight=12,
    qrSize=24, showBorders=false,
  } = profile;

  const outerStyle = {
    width: width ? `${width}mm` : undefined,
    height: height ? `${height}mm` : undefined,
    padding: `${margin.top||0}mm ${margin.right||0}mm ${margin.bottom||0}mm ${margin.left||0}mm`,
    border: showBorders ? "1px dashed #d0d0d0" : "none",
    fontFamily, boxSizing:"border-box", display:"flex", flexDirection:"column", gap:"1mm",
  };

  const barcodeRef = React.useRef(null);
  React.useEffect(() => {
    if (!barcodeRef.current || !data?.label_code) return;
    try {
      JsBarcode(barcodeRef.current, data.label_code, {
        format: barcodeFormat, height: mmToPx(barcodeHeight, density, scale),
        width: 1, displayValue: false, margin: 0,
      });
    } catch {}
  }, [barcodeRef, data?.label_code, barcodeFormat, barcodeHeight, density, scale]);

  // Clean concentration value and format it
  const cleanConc = String(data.actual_conc || "").replace(/\s*ppm/i, "");
  const formattedConc = formatNumber(cleanConc);

  return (
    <div style={outerStyle}>
      <div style={{fontWeight:600,fontSize:"3.3mm"}}>{data.compound_name || ""}</div>
      <div style={{fontSize:"2.7mm",lineHeight:1.2,color:"#333"}}>
        CAS: {data.cas || "-"} • Conc.: {formattedConc} ppm<br/>
        Date: {data.date || "-"} • Prepared by: {data.prepared_by || "-"}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"2mm",marginTop:"1mm"}}>
        <QRCodeCanvas value={data.label_code || "-"} size={mmToPx(qrSize,density,scale)} level="M" includeMargin={false}/>
        <svg ref={barcodeRef}/>
      </div>
      <div style={{fontSize:"2.4mm",color:"#555"}}>Code: {data.label_code || "-"}</div>
    </div>
  );
}
