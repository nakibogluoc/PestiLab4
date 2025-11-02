import React from "react";
import { exportLabelsToPDF, exportLabelsToWord, exportLabelsToZIP } from "../utils/exporters";
import { mapRecordToLabelRow } from "../utils/mapRecordToLabelRow";

// Per-row reprint menu for PDF / Word / ZIP
export default function ReprintMenu({ record }) {
  const [open, setOpen] = React.useState(false);
  const one = React.useCallback(() => [mapRecordToLabelRow(record)], [record]);

  const onPDF  = () => { exportLabelsToPDF(one());  setOpen(false); };
  const onWord = () => { exportLabelsToWord(one()); setOpen(false); };
  const onZIP  = () => { exportLabelsToZIP(one());  setOpen(false); };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="px-2 py-1 rounded border text-sm hover:bg-gray-50"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Reprint
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 w-44 rounded border bg-white shadow"
          role="menu"
          onMouseLeave={() => setOpen(false)}
        >
          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={onPDF}>
            Reprint as PDF
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={onWord}>
            Reprint as Word
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={onZIP}>
            Reprint as ZIP
          </button>
        </div>
      )}
    </div>
  );
}
