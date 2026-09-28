const fs = require('fs');

async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k/gviz/tq?tqx=out:csv';
  const res = await fetch(url);
  const text = await res.text();
  
  function parseCSVRows(text) {
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

  const rows = parseCSVRows(text);
  console.log('Total rows:', rows.length);
  const emails = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 4) continue;
    emails.push({
      sr: r[0],
      usn: r[1],
      name: r[2],
      college_email: r[3].trim().toLowerCase()
    });
  }
  console.log('Total student emails parsed:', emails.length);
  emails.forEach(e => console.log(`${e.sr}. [${e.usn}] ${e.name} -> ${e.college_email}`));
}

run();
