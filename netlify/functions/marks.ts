import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  try {
    const spreadsheetId =
      event.queryStringParameters?.spreadsheetId ||
      event.queryStringParameters?.sheetId ||
      process.env.GOOGLE_SHEETS_ID ||
      '167hosqqnr-PlwTZeU2dG3K1XUCBfZgNqD_mwG5oUDdI';

    const sheetName = event.queryStringParameters?.sheet || 'Master-Sheet';

    const targetUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId
    )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Google Sheets responded with HTTP ${response.status}`,
        }),
      };
    }

    const csvText = await response.text();
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
      },
      body: csvText,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err?.message || 'Failed to retrieve marks.' },
      }),
    };
  }
};
