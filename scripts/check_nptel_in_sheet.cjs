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
  const html = await fetchUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`);
  
  // Find all sheet names and gids in the html
  const regex = /gid=(\d+)[^"]*">([^<]+)<\/a>/g;
  let match;
  console.log('--- FOUND TABS IN SPREADSHEET ---');
  while ((match = regex.exec(html)) !== null) {
    console.log(`gid: ${match[1]}, name: ${match[2]}`);
  }

  // Also search for "nptel" case insensitive in the entire html
  const idx = html.toLowerCase().indexOf('nptel');
  if (idx !== -1) {
    console.log('Found "nptel" in HTML at index:', idx);
    console.log(html.slice(Math.max(0, idx - 100), idx + 200));
  } else {
    console.log('"nptel" not found in HTML text');
  }
}

run();
