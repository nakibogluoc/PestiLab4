export function mapRecordToLabelRow(r) {
  return {
    date: r?.date || r?.createdAt || "",
    label_code: r?.code || r?.labelCode || r?.label_code || "",
    compound: (r?.compound && (r.compound.name || r.compound)) || r?.compound_name || "",
    cas: r?.cas || r?.cas_number || r?.casNo || "",
    concentration: r?.concentration_ppm ?? r?.concentration ?? r?.conc ?? "",
    prepared_by: r?.preparedBy || r?.user || r?.operator || r?.prepared_by || "",
    qr_data: r?.qr || r?.qr_data || r?.qrText || "",
  };
}
