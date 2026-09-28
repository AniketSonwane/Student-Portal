const fs = require('fs');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += c;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

const csv = fs.readFileSync('scripts/sem3_master_sheet.csv', 'utf8');
const rows = parseCSV(csv);
const headers = rows[0];
const aniket = rows.find(r => r[0] === 'CS25131');

console.log('--- ALL COLUMNS WHERE ANIKET HAS VALUES ---');
for (let i = 2; i < 145; i++) {
  const val = aniket[i];
  if (val && val !== '0' && val !== '-' && val !== '') {
    console.log(`[${i}] ${headers[i].replace(/\n/g, ' ')} ===> "${val}"`);
  }
}
