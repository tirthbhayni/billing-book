const XLSX = require('xlsx');
const fs = require('fs');

// create a dummy workbook
const wb = XLSX.utils.book_new();
const wsData = [
  ['Payment Details', null, 'Revenue Details'],
  ['Sub Order No', 'Order Date', 'Final Settlement'],
  ['123', '2023-01-01', 100],
  ['456', '2023-01-02', 200]
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Order Payments');

const jsonData = XLSX.utils.sheet_to_json(ws, { range: 1 });
console.log('range 1:', jsonData);

const normalData = XLSX.utils.sheet_to_json(ws);
console.log('normal:', normalData);
