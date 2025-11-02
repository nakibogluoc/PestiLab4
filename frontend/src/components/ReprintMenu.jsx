import React from "react";
import { useLabelReprint } from "./LabelReprintProvider";

export default function ReprintMenu({ record }) {
  const { openWith } = useLabelReprint();

  const handleOpen = () => {
    const payload = {
      label_code: record.code || record.labelCode || record.label_code || "",
      compound_name: record.compound?.name || record.compound || record.compound_name || "",
      cas: record.cas || record.cas_number || "",
      actual_conc: record.concentration_ppm ?? record.concentration ?? "",
      required_vol: record.required_volume_ml ?? record.required_vol ?? record.volume_ml ?? "",
      prepared_by: record.preparedBy || record.user || record.operator || record.prepared_by || "",
      date: record.date || record.createdAt || new Date().toISOString().slice(0, 10),
    };
    openWith(payload); // open the same modal — no save
  };

  return (
    <button
      type="button"
      className="px-2 py-1 rounded border text-sm hover:bg-gray-50"
      onClick={handleOpen}
    >
      Reprint
    </button>
  );
}
