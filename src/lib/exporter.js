// src/lib/exporter.js
import Papa from "papaparse";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

/**
 * Export array of objects ke CSV
 */
export function exportToCSV(filename, rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename.endsWith(".csv") ? filename : filename + ".csv");
}

/**
 * Export array of objects ke Excel
 */
export function exportToExcel(filename, rows, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    filename.endsWith(".xlsx") ? filename : filename + ".xlsx"
  );
}
