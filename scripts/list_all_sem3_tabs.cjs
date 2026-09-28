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
  
  // Extract all sheet names
  const regex = /name:\s*"([^"]+)",\s*pageUrl:[^}]+gid:\s*"(\d+)"/g;
  let match;
  console.log('--- ALL TABS IN SPREADSHEET ---');
  while ((match = regex.exec(html)) !== null) {
    console.log(`Tab: "${match[1]}", gid: ${match[2]}`);
  }
}

run();
