const OTP_API_KEY = 'f39384e1f09080d8237dfa7849a215fe';
const OTP_API_BASE_URL = 'https://api.otp.dev/v1';
const SENDER_ID = 'f0a99e9c-8cbe-4ed5-80df-18958c057702';
const TEMPLATE_ID = '19793c18-d417-4087-aeec-0e027ae883d6';

export interface SendOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send OTP to phone number using OTP.dev API
 */
export async function sendOTP(phoneNumber: string): Promise<SendOTPResponse> {
  try {
    const response = await fetch(`${OTP_API_BASE_URL}/verifications`, {
      method: 'POST',
      headers: {
        'X-OTP-Key': OTP_API_KEY,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          channel: 'sms',
          sender: SENDER_ID,
          phone: phoneNumber,
          template: TEMPLATE_ID,
          code_length: 4,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || data.message || 'Failed to send OTP',
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send OTP',
    };
  }
}

/**
 * Verify OTP code using OTP.dev API
 */
export async function verifyOTP(phoneNumber: string, code: string): Promise<VerifyOTPResponse> {
  try {
    const response = await fetch(`${OTP_API_BASE_URL}/verifications/verify`, {
      method: 'POST',
      headers: {
        'X-OTP-Key': OTP_API_KEY,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          phone: phoneNumber,
          code: code,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || data.message || 'Failed to verify OTP',
      };
    }

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify OTP',
    };
  }
}

