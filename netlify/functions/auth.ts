import { findStudentByGoogleEmail } from '../lib/studentRepository';

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string>;
}

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight OK' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' },
      }),
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const { email } = payload;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email or Google credential token is required.',
          },
        }),
      };
    }

    // Verify authorized student roster (Google Sheets check)
    const student = await findStudentByGoogleEmail(email);

    if (!student) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: `Access Denied: The Google account "${email}" is not registered in the student roster. Please contact the administrator.`,
          },
        }),
      };
    }

    // Successful student authentication & authorization
    const token = `jwt_session_${student.student_id}_${Buffer.from(student.google_email).toString('base64')}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          student,
          token,
        },
      }),
    };
  } catch {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal error occurred during authentication verification.',
        },
      }),
    };
  }
};
