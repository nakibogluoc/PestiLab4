import React from "react";
import { useLabelReprint } from "./LabelReprintProvider";

export default function LabelReprintDialog() {
  const { open, data, close } = useLabelReprint();
  if (!open || !data) return null;

  const onPrint = () => window.print(); // only print

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-xl">▣</span>
            <h2 className="text-lg font-semibold">Label Generated Successfully</h2>
          </div>
          <button className="text-sm px-2 py-1 border rounded" onClick={close}>
            Close
          </button>
        </div>

        <div className="p-4">
          {/* Calculation Summary */}
          <div className="rounded-lg border bg-emerald-50 p-4 mb-4">
            <h3 className="font-semibold text-emerald-900 mb-2">Calculation Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-emerald-900">
              <div>
                <div className="text-sm opacity-70">Actual Concentration:</div>
                <div className="text-2xl font-semibold">{data.actual_conc ?? "-"} ppm</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Required Volume:</div>
                <div className="text-2xl font-semibold">{data.required_vol ?? "-"} mL</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Label Code:</div>
                <div className="text-2xl font-semibold text-blue-700">{data.label_code ?? "-"}</div>
              </div>
            </div>
          </div>

          {/* Label Preview */}
          <div className="border rounded-lg p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1">
              <div className="font-bold">{data.compound_name ?? ""}</div>
              <div className="text-sm text-gray-600">
                CAS: {data.cas ?? "-"} • Conc.: {data.actual_conc ?? "-"} ppm
              </div>
              <div className="text-sm text-gray-600">
                Date: {data.date ?? "-"} • Prepared by: {data.prepared_by ?? "-"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Code: {data.label_code ?? "-"}
              </div>
            </div>
            <div className="h-24 w-24 bg-gray-200 rounded" aria-label="QR" />
            <div className="h-16 w-56 bg-gray-200 rounded" aria-label="Barcode" />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={onPrint}
            >
              Print Label
            </button>
            <button className="px-4 py-2 border rounded" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
