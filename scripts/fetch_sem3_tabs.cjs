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

async function run() {
  const spreadsheetId = '1rGxLk5dIaMuJNaxRpUjclIfrEqISSFMRrUI3gmujzPA';
  
  // Try fetching sem3-details
  const names = ['sem3-details', 'SEM3-Details', 'Details', 'Sheet1', 'Sheet2', 'Sheet8'];
  for (const name of names) {
    try {
      const csv = await fetchUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`);
      if (csv && csv.length > 50 && !csv.includes('<!DOCTYPE html>')) {
        console.log(`=== FOUND TAB: ${name} ===`);
        console.log(csv.slice(0, 500));
      }
    } catch (e) {
      // ignore
    }
  }
}

run();
