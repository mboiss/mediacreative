/**
 * Export JSON array of objects to a downloadable CSV file.
 * Handles string escaping, headers, and automatic browser download trigger.
 */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  headers?: { key: string; label: string }[]
) {
  if (!rows || rows.length === 0) {
    return;
  }

  // Determine headers
  const columns: { key: string; label: string }[] = headers
    ? headers
    : Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  // Generate CSV Header row
  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");

  // Generate CSV Data rows
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        let val: any = row[col.key];
        let valStr = "";
        if (val === null || val === undefined) {
          valStr = "";
        } else if (typeof val === "object") {
          valStr = JSON.stringify(val);
        } else {
          valStr = String(val);
        }
        return `"${valStr.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
