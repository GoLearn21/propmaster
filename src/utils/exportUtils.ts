import { Report } from '../services/reportsService';

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      const stringValue = value?.toString() || '';
      return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
        ? `"${stringValue.replace(/"/g, '""')}"` 
        : stringValue;
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * Export data to Excel format (CSV with .xlsx extension for simplicity)
 */
export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // For now, export as CSV with xlsx extension
  // In production, you would use a library like xlsx or exceljs
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join('\t'), // Use tabs for Excel
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return value?.toString() || '';
    }).join('\t'))
  ].join('\n');

  downloadFile(csvContent, `${filename}.xlsx`, 'application/vnd.ms-excel');
}

/**
 * Export to PDF (simplified version)
 */
export function exportToPDF(reportName: string, htmlContent: string) {
  // In production, use a library like jsPDF or html2pdf
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; }
          h1 { color: #111827; }
          .summary { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>${reportName}</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        ${htmlContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Helper function to download file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
