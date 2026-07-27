import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { generateToken, getTokenExpiry } from '../utils/token';

const TEXTBEE_URL = 'https://api.textbee.dev/api/v1/gateway/devices';
const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || '';
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || '';

export interface SmsVerificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  remaining?: number;
}

function buildTextbeeHeaders(): Record<string, string> {
  if (!TEXTBEE_API_KEY) {
    throw new AppError('SMS service is not configured (TEXTBEE_API_KEY missing)', 500);
  }
  if (!TEXTBEE_DEVICE_ID) {
    throw new AppError('SMS service is not configured (TEXTBEE_DEVICE_ID missing)', 500);
  }

  return {
    'Content-Type': 'application/json',
    'x-api-key': TEXTBEE_API_KEY,
  };
}

export async function sendSmsVerificationCode(phone: string, userId: string): Promise<SmsVerificationResult> {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) {
    return { success: false, error: 'Phone number is required' };
  }

  const code = generateToken(6).slice(0, 6);
  const expiresAt = getTokenExpiry(10);

  await prisma.smsVerificationToken.upsert({
    where: { userId },
    update: { code, phone: trimmedPhone, expiresAt },
    create: { userId, phone: trimmedPhone, code, expiresAt },
  });

  const message = `Your UnimartX verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;

  try {
    const url = `${TEXTBEE_URL}/${encodeURIComponent(TEXTBEE_DEVICE_ID)}/send-sms`;
    const response = await fetch(url, {
      method: 'POST',
      headers: buildTextbeeHeaders(),
      body: JSON.stringify({
        recipients: [trimmedPhone],
        message,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      messageId?: string;
      quotaRemaining?: number;
    };

    if (!response.ok || data.success === false) {
      return { success: false, error: data.error || 'Failed to send SMS' };
    }

    return {
      success: true,
      messageId: data.messageId,
      remaining: data.quotaRemaining,
    };
  } catch (error) {
    console.error('[sms] Failed to send SMS via Textbee:', error);
    return { success: false, error: 'Failed to send SMS. Please try again.' };
  }
}

export async function verifySmsCode(userId: string, code: string): Promise<boolean> {
  const token = await prisma.smsVerificationToken.findUnique({
    where: { userId },
  });

  if (!token) return false;

  if (token.expiresAt < new Date()) {
    await prisma.smsVerificationToken.delete({ where: { id: token.id } });
    return false;
  }

  if (token.code !== code) return false;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { smsVerified: true },
    });

    await tx.smsVerificationToken.delete({
      where: { id: token.id },
    });
  });

  return true;
}

export async function resendSmsVerificationCode(phone: string, userId: string): Promise<SmsVerificationResult> {
  return sendSmsVerificationCode(phone, userId);
}

export async function sendSms(toPhone: string, message: string): Promise<SmsVerificationResult> {
  const trimmedPhone = toPhone.trim();
  if (!trimmedPhone) {
    return { success: false, error: 'Phone number is required' };
  }

  if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
    return { success: false, error: 'SMS service is not configured' };
  }

  try {
    const url = `${TEXTBEE_URL}/${encodeURIComponent(TEXTBEE_DEVICE_ID)}/send-sms`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEXTBEE_API_KEY,
      },
      body: JSON.stringify({
        recipients: [trimmedPhone],
        message,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      messageId?: string;
      quotaRemaining?: number;
    };

    if (!response.ok || data.success === false) {
      return { success: false, error: data.error || 'Failed to send SMS' };
    }

    return {
      success: true,
      messageId: data.messageId,
      remaining: data.quotaRemaining,
    };
  } catch (error) {
    console.error('[sms] Failed to send SMS via Textbee:', error);
    return { success: false, error: 'Failed to send SMS. Please try again.' };
  }
}
