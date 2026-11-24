const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
  const SEM3_ID = '1rGxLk5dIaMuJNaxRpUjclIfrEqISSFMRrUI3gmujzPA';
  const csvText = await fetchUrl(`https://docs.google.com/spreadsheets/d/${SEM3_ID}/gviz/tq?tqx=out:csv&sheet=Master-Sheet`);
  fs.writeFileSync('scripts/sem3_master_sheet.csv', csvText, 'utf8');

  const rows = parseCSV(csvText);
  console.log('Total Rows in Sem 3:', rows.length);
  if (rows.length === 0) {
    console.log('Empty response or not found');
    return;
  }
  console.log('Total Columns in Row 0:', rows[0].length);

  console.log('\n--- HEADERS IN SEMESTER 3 ---');
  rows[0].forEach((h, i) => console.log(`[${i}]: ${h.replace(/\n/g, ' ')}`));

  const aniket = rows.find(r => r[0] === 'CS25131');
  if (aniket) {
    console.log('\nFound Aniket in Sem 3:');
    console.log('USN:', aniket[0]);
    console.log('Name:', aniket[1]);
  } else {
    console.log('\nFirst 3 rows:');
    rows.slice(0, 4).forEach((r, i) => console.log(`Row ${i}:`, r.slice(0, 6)));
  }
}

run().catch(console.error);
