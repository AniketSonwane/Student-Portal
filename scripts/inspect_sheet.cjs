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
      if (currentRow.some(col => col.length > 0)) {
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
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

const text = fs.readFileSync('master_sheet.csv', 'utf8');
const rows = parseCSV(text);

const aniket = rows.find(r => r[0] === 'CS25131');
console.log('Aniket Record:');
console.log('USN:', aniket[0]);
console.log('Name:', aniket[1]);
console.log('Total Credits:', aniket[94]);
console.log('SGPA:', aniket[95]);
console.log('Result:', aniket[96]);

console.log('\nSubject Details for Aniket:');
console.log('SDDE (02-10): Total=', aniket[9], 'Grade=', aniket[10]);
console.log('AP (11-19): Total=', aniket[18], 'Grade=', aniket[19]);
console.log('APL (20-24): Total=', aniket[23], 'Grade=', aniket[24]);
console.log('EGD (25-33): Total=', aniket[32], 'Grade=', aniket[33]);
console.log('EGDL (34-38): Total=', aniket[37], 'Grade=', aniket[38]);
console.log('HN (39-43): Total=', aniket[42], 'Grade=', aniket[43]);
console.log('PPS (44-53): Total=', aniket[52], 'Grade=', aniket[53]);
console.log('PPSL (54-58): Total=', aniket[57], 'Grade=', aniket[58]);
console.log('IKS (59-64): Total=', aniket[63], 'Grade=', aniket[64]);
console.log('LLC-1 (65-69): Total=', aniket[68], 'Grade=', aniket[69]);
console.log('INCENTIVES (70-71): Grade=', aniket[70], 'Incentives=', aniket[71]);

console.log('\nGrade Points (72-82):', rows[0].slice(72, 83).map((h, i) => `${h.replace('Grade Points ', '')}: ${aniket[72 + i]}`).join(', '));
console.log('Credit Points (83-93):', rows[0].slice(83, 94).map((h, i) => `${h.replace('Credits Points ', '')}: ${aniket[83 + i]}`).join(', '));

// Print total students
console.log('\nTotal Students in Master Sheet:', rows.length - 1);
