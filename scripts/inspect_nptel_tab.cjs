const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

async function run() {
  const spreadsheetId = '1rGxLk5dIaMuJNaxRpUjclIfrEqISSFMRrUI3gmujzPA';
  const csv = await fetchUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=NPTEL`);
  const rows = parseCSV(csv);
  console.log('Total rows in NPTEL tab:', rows.length);
  console.log('Header row:', rows[0]);
  
  const withValues = [];
  const withoutValues = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const usn = r[0];
    const name = r[1];
    const marks = r[2];
    const grade = r[3];
    if (marks || grade) {
      withValues.push({ usn, name, marks, grade });
    } else {
      withoutValues.push({ usn, name });
    }
  }

  console.log(`\nStudents with explicit NPTEL marks/grade in sheet (${withValues.length}):`);
  console.log(withValues);
  console.log(`\nStudents without explicit marks (${withoutValues.length}), first 5:`);
  console.log(withoutValues.slice(0, 5));
}

run();
