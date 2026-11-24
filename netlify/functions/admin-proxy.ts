import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  const scriptUrl =
    process.env.VITE_GOOGLE_SHEETS_ADMIN_API_URL ||
    process.env.GOOGLE_SHEETS_ADMIN_API_URL ||
    '';

  if (!scriptUrl) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'VITE_GOOGLE_SHEETS_ADMIN_API_URL is not set on Netlify.' }),
    };
  }

  try {
    const rawBody = event.body || '{}';
    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = {};
    }

    if (!parsed.spreadsheetId) {
      parsed.spreadsheetId =
        process.env.VITE_GOOGLE_SHEETS_ADMIN_ID ||
        process.env.GOOGLE_SHEETS_ADMIN_ID ||
        '';
    }

    // Server-side fetch to Apps Script follows 302 redirects without browser CORS restrictions
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(parsed),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { success: response.ok, raw: responseText };
    }

    return {
      statusCode: response.status || 200,
      headers,
      body: JSON.stringify(responseJson),
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Netlify proxy error: ${err?.message || String(err)}`,
      }),
    };
  }
};
