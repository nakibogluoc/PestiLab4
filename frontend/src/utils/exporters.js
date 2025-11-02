// frontend/src/utils/exporters.js
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun } from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";

/** rows: [{date,label_code,compound,cas,concentration,prepared_by,qr_data}, ...] */
export function exportLabelsToPDF(rows) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty list");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const columns = [
      { header: "DATE", dataKey: "date" },
      { header: "LABEL CODE", dataKey: "label_code" },
      { header: "COMPOUND", dataKey: "compound" },
      { header: "CAS", dataKey: "cas" },
      { header: "CONC.", dataKey: "concentration" },
      { header: "PREPARED BY", dataKey: "prepared_by" },
      { header: "QR DATA", dataKey: "qr_data" },
    ];
    const chunk = 500; // paginate very long tables
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      if (i > 0) doc.addPage();
      doc.text("PestiLab – Labels Export", 40, 40);
      (doc as any).autoTable({
        startY: 60,
        styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [240, 240, 240] },
        columns,
        body: slice,
      });
    }
    doc.save(`PestiLab_Labels_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch (e) {
    console.error("PDF export error:", e);
    alert("PDF export failed.");
  }
}

export async function exportLabelsToWord(rows) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty list");
    const head = ["DATE","LABEL CODE","COMPOUND","CAS","CONC.","PREPARED BY","QR DATA"]
      .map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] }));
    const body = rows.map(r => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(r.date ?? "")] }),
        new TableCell({ children: [new Paragraph(r.label_code ?? "")] }),
        new TableCell({ children: [new Paragraph(r.compound ?? "")] }),
        new TableCell({ children: [new Paragraph(r.cas ?? "")] }),
        new TableCell({ children: [new Paragraph(String(r.concentration ?? ""))] }),
        new TableCell({ children: [new Paragraph(r.prepared_by ?? "")] }),
        new TableCell({ children: [new Paragraph(r.qr_data ?? "")] }),
      ]
    }));
    const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [ new TableRow({ children: head }), ...body ] });
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ children: [new TextRun({ text:"PestiLab – Labels Export", bold:true, size:28 })] }),
      new Paragraph(" "),
      table
    ]}]});
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `PestiLab_Labels_${new Date().toISOString().slice(0,10)}.docx`);
  } catch (e) {
    console.error("Word export error:", e);
    alert("Word export failed.");
  }
}

export async function exportLabelsToZIP(rows) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty list");
    const zip = new JSZip();

    // 1) Master CSV
    const csvHeader = ["DATE","LABEL CODE","COMPOUND","CAS","CONCENTRATION","PREPARED BY","QR DATA"];
    const csv = [csvHeader.join(","), ...rows.map(r => [
      r.date ?? "", r.label_code ?? "", csvQuote(r.compound), r.cas ?? "",
      r.concentration ?? "", csvQuote(r.prepared_by), csvQuote(r.qr_data)
    ].join(","))].join("\n");
    zip.file("labels.csv", csv);

    // 2) Optional: one TXT per label (readable archive)
    rows.forEach((r, i) => {
      const name = (r.label_code || `LABEL_${i+1}`).replace(/[^\w\-]+/g, "_");
      const txt = `DATE: ${r.date ?? ""}\nLABEL CODE: ${r.label_code ?? ""}\nCOMPOUND: ${r.compound ?? ""}\nCAS: ${r.cas ?? ""}\nCONCENTRATION: ${r.concentration ?? ""}\nPREPARED BY: ${r.prepared_by ?? ""}\nQR DATA: ${r.qr_data ?? ""}`;
      zip.file(`${name}.txt`, txt);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `PestiLab_Labels_${new Date().toISOString().slice(0,10)}.zip`);
  } catch (e) {
    console.error("ZIP export error:", e);
    alert("ZIP export failed.");
  }
}

function csvQuote(v){ const s=(v??"").toString(); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
