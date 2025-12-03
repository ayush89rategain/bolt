import { Listing } from '../lib/supabase';

export function exportToCSV(listings: Listing[], filename: string = 'listings.csv') {
  const headers = ['Name', 'Rating', 'Address', 'Phone', 'Website', 'Description'];

  const rows = listings.map(listing => [
    listing.name,
    listing.rating?.toString() || '',
    listing.address || '',
    listing.phone || '',
    listing.website || '',
    listing.description || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportToExcel(listings: Listing[], filename: string = 'listings.xlsx') {
  const headers = ['Name', 'Rating', 'Address', 'Phone', 'Website', 'Description'];

  const rows = listings.map(listing => [
    listing.name,
    listing.rating?.toString() || '',
    listing.address || '',
    listing.phone || '',
    listing.website || '',
    listing.description || '',
  ]);

  let xmlContent = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
  xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
  xmlContent += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
  xmlContent += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
  xmlContent += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
  xmlContent += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
  xmlContent += '<Worksheet ss:Name="Listings"><Table>';

  xmlContent += '<Row>';
  headers.forEach(header => {
    xmlContent += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`;
  });
  xmlContent += '</Row>';

  rows.forEach(row => {
    xmlContent += '<Row>';
    row.forEach((cell, index) => {
      const type = index === 1 && cell ? 'Number' : 'String';
      xmlContent += `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
    });
    xmlContent += '</Row>';
  });

  xmlContent += '</Table></Worksheet></Workbook>';

  downloadFile(xmlContent, filename, 'application/vnd.ms-excel');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
