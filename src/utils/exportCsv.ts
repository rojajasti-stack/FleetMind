/**
 * Export data to CSV with UTF-8 BOM
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const cols = columns || Object.keys(data[0]).map(k => ({ key: k as keyof T, label: k }));

  const headers = cols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map(row => {
    return cols
      .map(col => {
        const val = row[col.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
