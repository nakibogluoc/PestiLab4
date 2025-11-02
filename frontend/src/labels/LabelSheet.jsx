import React from "react";
import LabelCard from "./LabelCard";

export default function LabelSheet({ dataList, profile }) {
  const { page, grid, label } = profile;
  if (!page || !grid) return <LabelCard data={dataList[0]} profile={profile} />;
  const sheetStyle = {
    width: `${page.width}mm`, height: `${page.height}mm`,
    display:"grid",
    gridTemplateColumns:`repeat(${grid.cols}, ${label.width}mm)`,
    gridTemplateRows:`repeat(${grid.rows}, ${label.height}mm)`,
    gap:`${grid.gutterY||0}mm ${grid.gutterX||0}mm`,
    boxSizing:"border-box",
  };
  const cardProfile = {
    width: label.width, height: label.height, margin:{top:0,right:0,bottom:0,left:0},
    density: profile.density, scale: profile.scale, fontFamily: profile.fontFamily,
    barcodeFormat: profile.barcodeFormat, barcodeHeight: profile.barcodeHeight,
    qrSize: profile.qrSize, showBorders: profile.showBorders
  };
  const arr = Array.from({length: grid.rows*grid.cols}, () => dataList[0]);
  return <div style={sheetStyle}>{arr.map((d,i)=><LabelCard key={i} data={d} profile={cardProfile}/>)}</div>;
}
