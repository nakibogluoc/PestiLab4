import React from "react";
import { useLabelReprint } from "./LabelReprintProvider";
import { LABEL_PROFILES, DEFAULT_PROFILE_ID } from "../labels/labelProfiles";
import LabelSheet from "../labels/LabelSheet";
import { formatNumber } from "../utils/formatNumber";

export default function LabelReprintDialog() {
  const { open, data, close } = useLabelReprint();
  const [profileId, setProfileId] = React.useState(
    localStorage.getItem("pestilab:label_profile") || DEFAULT_PROFILE_ID
  );
  const profile = LABEL_PROFILES[profileId];
  React.useEffect(() => { localStorage.setItem("pestilab:label_profile", profileId); }, [profileId]);
  if (!open || !data) return null;
  const onPrint = () => window.print(); // print only, no save

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:bg-white print:block">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow print:shadow-none print:max-w-none">
        <div className="flex items-center justify-between px-4 py-3 border-b print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-xl">▣</span>
            <h2 className="text-lg font-semibold">Label Generated Successfully</h2>
          </div>
          <button className="text-sm px-2 py-1 border rounded" onClick={close}>Close</button>
        </div>
        <div className="px-4 pt-3 flex items-center gap-2 print:hidden">
          <label className="text-sm text-gray-600">Label Profile:</label>
          <select className="border rounded px-2 py-1 text-sm" value={profileId} onChange={e=>setProfileId(e.target.value)}>
            {Object.values(LABEL_PROFILES).map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </select>
          <div className="text-xs text-gray-500 ml-auto">Printer: Scaling 100%, Fit OFF, Margins None.</div>
        </div>

        <div className="p-4">
          <div className="rounded-lg border bg-emerald-50 p-4 mb-4 print:hidden">
            <h3 className="font-semibold text-emerald-900 mb-2">Calculation Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-emerald-900">
              <div>
                <div className="text-sm opacity-70">Actual Concentration:</div>
                <div className="text-2xl font-semibold">{formatNumber(data.actual_conc)} ppm</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Required Volume:</div>
                <div className="text-2xl font-semibold">{data.required_vol || "–"} mL</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Label Code:</div>
                <div className="text-2xl font-semibold text-blue-700">{data.label_code ?? "-"}</div>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-4 overflow-auto print:border-0 print:p-0">
            <LabelSheet dataList={[data]} profile={profile} />
          </div>
          <div className="mt-4 flex items-center gap-2 print:hidden">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onPrint}>Print Label</button>
            <button className="px-4 py-2 border rounded" onClick={close}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
