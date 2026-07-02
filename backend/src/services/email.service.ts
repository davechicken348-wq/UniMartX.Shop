import { Resend } from 'resend';
import { AppError } from '../middleware/errorHandler';

let resend: Resend | null = null;
let fromAddress: string = 'UnimartX <onboarding@resend.dev>';

/* ═══════════════════════════════════════════════════════════════
   UNIFIED EMAIL TEMPLATE SYSTEM
   Single design system for all transactional emails.
   Dark theme, table-based layout, Quicksand font.
═══════════════════════════════════════════════════════════════ */

const BRAND = '#34d399';
const BRAND_DARK = '#10b981';
const BG = '#0a0a0f';
const BG_2 = '#111118';
const BG_3 = '#16161f';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#f1f0ee';
const TEXT_2 = '#a09f9c';
const TEXT_3 = '#6b6a68';
const FONT = "'Quicksand', -apple-system, sans-serif";

const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${FONT}; line-height: 1.6; color: ${TEXT}; background: ${BG}; }
  table { border-collapse: collapse; }
`;

function wrapperStart(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${BASE_STYLES}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:${BG_2};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;max-width:580px;width:100%;">`;
}

function headerBlock(title: string, subtitle: string, gradient: string): string {
  return `<tr><td style="background:linear-gradient(135deg,${gradient});padding:32px 40px;">
  <p style="margin:0;font-size:22px;font-weight:700;color:#0a0a0f;">${title}</p>
  <p style="margin:6px 0 0;font-size:14px;color:rgba(10,10,15,0.7);">${subtitle}</p>
</td></tr>
<tr><td style="padding:32px 40px;">`;
}

function footerBlock(): string {
  return `</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid ${BORDER};text-align:center;">
  <p style="margin:0;font-size:12px;color:${TEXT_3};">&copy; 2025 UnimartX. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function ctaButton(href: string, label: string, gradient: string = `${BRAND_DARK}, ${BRAND}`): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
  <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,${gradient});color:#0a0a0f;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">${label}</a>
</td></tr></table>`;
}

function infoBox(content: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e28;border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
<tr><td style="padding:18px 24px;text-align:left;">${content}</td></tr>
</table>`;
}

function altUrl(label: string, url: string): string {
  return `<p style="margin:0 0 10px;font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">${label}</p>
<p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:${TEXT_3};word-break:break-all;background:${BG_3};padding:12px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);line-height:1.5;">${url}</p>`;
}

function esc(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
}

/* ═══════════════════════════════════════════════════════════════
   EMAIL GENERATORS
═══════════════════════════════════════════════════════════════ */

export function generateVerificationEmail(userName: string, verificationUrl: string): string {
  const body = `
  <p style="margin:0 0 32px;font-size:15px;color:${TEXT_2};line-height:1.6;">Hello <strong style="color:${BRAND};">${esc(userName)}</strong>, please confirm your email to fully activate your UnimartX account.</p>
  ${ctaButton(verificationUrl, 'Verify Email Address', `${BRAND_DARK}, ${BRAND}`)}
  ${infoBox(`<p style="margin:0;font-size:14px;color:${TEXT_2};line-height:1.6;"><strong style="color:${BRAND};">⏱ This link expires in 24 hours.</strong><br>For your security, please verify as soon as possible.</p>`)}
  ${altUrl('Or paste this URL into your browser', verificationUrl)}
  <p style="margin:28px 0 10px;font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Need help?</p>
  <p style="margin:0;font-size:13px;color:${TEXT_3};">If you didn't create an account, you can safely ignore this email.</p>`;
  return wrapperStart('Verify Your Email - UnimartX') +
    headerBlock('Verify your email address', 'Email Verification', `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

export function generateWelcomeEmail(userName: string): string {
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};line-height:1.6;">Welcome aboard — glad to have you here.</p>
  <p style="margin:0;font-size:13px;color:${TEXT_3};line-height:1.7;">Verify your email to unlock full access.</p>`;
  return wrapperStart('Welcome to UnimartX') +
    headerBlock(`Welcome, ${esc(userName)}`, 'You\'re in!', `#6366f1, #8b5cf6`) +
    body + footerBlock();
}

export function generatePasswordResetEmail(userName: string, resetUrl: string): string {
  const loginUrl = `${getVerificationBaseUrl()}/pages/auth/login.html`; // unused but kept
  const body = `
  <p style="margin:0 0 32px;font-size:15px;color:${TEXT_2};line-height:1.6;">Hello <strong style="color:${TEXT};">${esc(userName)}</strong>,<br>We received a request to reset your password. Click the button below to choose a new password.</p>
  ${ctaButton(resetUrl, 'Reset Password', '#f59e0b, #fbbf24')}
  ${infoBox(`<p style="margin:0;font-size:15px;color:${TEXT_2};line-height:1.5;"><span style="color:#d97706;font-weight:700;">If you didn't request a password reset,</span><br>you can safely ignore this email. Your password will not be changed.</p>`)}
  ${altUrl('Or paste this URL into your browser', resetUrl)}`;
  return wrapperStart('Reset Your Password - UnimartX') +
    headerBlock('Reset Your Password', 'Password Reset', '#f59e0b, #fbbf24') +
    body + footerBlock();
}

export function generatePasswordChangedEmail(userName: string, frontendUrl: string): string {
  const loginUrl = `${frontendUrl.replace(/\/$/, '')}/pages/auth/login.html`;
  const body = `
  <p style="margin:0 0 32px;font-size:15px;color:${TEXT_2};line-height:1.6;">Hello <strong style="color:${TEXT};">${esc(userName)}</strong>,<br>Your password was changed successfully. If you did not perform this change, please contact support immediately.</p>
  ${ctaButton(loginUrl, 'Log In', `${BRAND_DARK}, ${BRAND}`)}
  ${infoBox(`<p style="margin:0;font-size:14px;color:${TEXT_2};line-height:1.5;"><strong>Need help?</strong><br>If you're having trouble logging in, you can reset your password again from the login page.</p>`)}`;
  return wrapperStart('Your Password Was Changed - UnimartX') +
    headerBlock('Password Changed Successfully', 'Security', `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

export function generateSellerFollowedEmail(buyerName: string, sellerName: string, sellerStoreUrl: string): string {
  const settingsUrl = `${getVerificationBaseUrl()}/pages/buyer/account/settings.html`;
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(buyerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">You are now following <strong style="color:#fbbf24;">${esc(sellerName)}</strong>. We'll notify you when they add new products or run promotions.</p>
  ${ctaButton(sellerStoreUrl, 'Visit Store', '#f59e0b, #fbbf24')}
  <p style="margin:0;font-size:13px;color:${TEXT_3};">You're receiving this because you have follow notifications enabled. You can update your preferences in your <a href="${settingsUrl}" style="color:#fbbf24;">account settings</a>.</p>`;
  return wrapperStart("You're Now Following a Seller") +
    headerBlock("You're Now Following a Seller", 'Stay updated with their latest products', '#f59e0b, #fbbf24') +
    body + footerBlock();
}

export function generateNewReviewEmail(sellerName: string, reviewerName: string, productName: string, rating: number, comment: string | null, productUrl: string): string {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const commentBlock = comment ? `<p style="margin:0 0 0 0;font-size:15px;color:${TEXT_2};line-height:1.7;font-style:italic;">&ldquo;${esc(comment)}&rdquo;</p>` : '';
  const settingsUrl = `${getVerificationBaseUrl()}/pages/seller/private/profile/account-settings.html`;
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};"><strong style="color:${TEXT};">${esc(reviewerName)}</strong> just reviewed your product <strong style="color:${BRAND};">${esc(productName)}</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:24px;">
    <p style="margin:0 0 8px;font-size:22px;letter-spacing:3px;color:#fbbf24;">${stars}</p>
    <p style="margin:0 0 12px;font-size:13px;color:${TEXT_3};">${rating} out of 5 stars</p>
    ${commentBlock}
  </td></tr>
  </table>
  ${ctaButton(productUrl, 'View Product', `${BRAND_DARK}, ${BRAND}`)}
  <p style="margin:0;font-size:13px;color:${TEXT_3};">You're receiving this because you have review notifications enabled. You can update your preferences in your <a href="${settingsUrl}" style="color:${BRAND};">account settings</a>.</p>`;
  return wrapperStart(`New ${rating}★ review on "${productName}"`) +
    headerBlock('New Review on Your Product', 'Someone left a review — see what they said', `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

export function generateContactSellerEmail(sellerName: string, buyerName: string, buyerEmail: string, message: string, sellerStoreUrl: string): string {
  const safeMessage = esc(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};"><strong style="color:${BRAND};">${esc(buyerName)}</strong> sent you a message from your UnimartX store listing:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 12px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Message</p>
    <p style="margin:0;font-size:15px;color:${TEXT};line-height:1.7;">${safeMessage}</p>
    <p style="margin:16px 0 0;font-size:13px;color:${TEXT_3};">Reply to: <a href="mailto:${esc(buyerEmail)}" style="color:${BRAND};">${esc(buyerEmail)}</a></p>
  </td></tr>
  </table>
  ${ctaButton(sellerStoreUrl, 'View Your Store', `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart(`New message from ${buyerName} via UnimartX`) +
    headerBlock('New Message from a Buyer', 'Someone reached out about your store', `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

export function generateSupportContactEmail(name: string, email: string, phone: string, subject: string, message: string): string {
  const body = `
  <div style="margin-bottom:20px;"><div style="font-size:12px;font-weight:700;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Name</div><div style="font-size:15px;color:${TEXT};line-height:1.7;">${esc(name)}</div></div>
  <div style="margin-bottom:20px;"><div style="font-size:12px;font-weight:700;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Email</div><div style="font-size:15px;color:${TEXT};line-height:1.7;"><a href="mailto:${esc(email)}" style="color:${BRAND};text-decoration:none;">${esc(email)}</a></div></div>
  ${phone ? `<div style="margin-bottom:20px;"><div style="font-size:12px;font-weight:700;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Phone</div><div style="font-size:15px;color:${TEXT};line-height:1.7;">${esc(phone)}</div></div>` : ''}
  <div style="margin-bottom:20px;"><div style="font-size:12px;font-weight:700;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Subject</div><div style="font-size:15px;color:${TEXT};line-height:1.7;text-transform:capitalize;">${esc(subject)}</div></div>
  <div style="margin-bottom:24px;"><div style="font-size:12px;font-weight:700;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Message</div><div style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;padding:20px 24px;font-size:15px;color:${TEXT};line-height:1.7;">${esc(message).replace(/\n/g, '<br>')}</div></div>
  ${ctaButton(`mailto:${esc(email)}?subject=Re: ${esc(subject)}`, `Reply to ${esc(name.split(' ')[0])}`, `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart('New Contact Form Submission') +
    headerBlock('New Contact Form Message', 'Someone reached out from the UnimartX contact page', `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

export function generateSellerNewOrderEmail(sellerName: string, orderNumber: string, items: { name: string; quantity: number; price: number }[], totalAmount: number, orderDetailsUrl: string, buyerName: string, buyerAddress: string): string {
  const fmt = (n: number) => `GH₵ ${n.toFixed(2)}`;
  const itemsList = items.map(i => `<tr><td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:${TEXT};">${esc(i.name)} <span style="color:${TEXT_3};">x${i.quantity}</span></td><td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:${TEXT};text-align:right;">${fmt(i.price * i.quantity)}</td></tr>`).join('');
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">You've received a new order. Here are the details:</p>
  <div style="background:#1e1e28;border:1px solid ${BORDER};border-radius:12px;padding:20px 24px;margin-bottom:20px;">
    <div style="font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Order Reference</div>
    <div style="font-size:18px;font-weight:700;color:#fbbf24;margin-top:4px;">#${esc(orderNumber)}</div>
  </div>
  <div style="background:#1a1a24;border-left:3px solid #fbbf24;padding:14px 18px;border-radius:8px;margin-bottom:20px;font-size:14px;color:${TEXT_2};line-height:1.6;">
    <strong style="color:${TEXT};">Buyer:</strong> ${esc(buyerName)}<br>
    <strong style="color:${TEXT};">Delivery:</strong> ${esc(buyerAddress)}
  </div>
  <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Items</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead><tr><th style="text-align:left;padding:10px 16px;font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.1);">Product</th><th style="text-align:right;padding:10px 16px;font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.1);">Price</th></tr></thead>
    <tbody>${itemsList}</tbody>
    <tfoot><tr style="font-weight:700;font-size:16px;color:#fbbf24 !important;border-bottom:none !important;padding-top:14px;"><td style="padding:10px 16px;border-top:2px solid rgba(255,255,255,0.1);">Total Paid</td><td style="padding:10px 16px;border-top:2px solid rgba(255,255,255,0.1);text-align:right;">${fmt(totalAmount)}</td></tr></tfoot>
  </table>
  ${ctaButton(orderDetailsUrl, 'View Order Details', '#f59e0b, #fbbf24')}`;
  return wrapperStart(`New order received #${orderNumber}`) +
    headerBlock('New Order Received', 'You have a new order!', '#f59e0b, #fbbf24') +
    body + footerBlock();
}

export function generateBuyerOrderConfirmationEmail(buyerName: string, orderNumber: string, items: { name: string; quantity: number; price: number }[], totalAmount: number, orderDetailsUrl: string, storeName: string): string {
  const fmt = (n: number) => `GH₵ ${n.toFixed(2)}`;
  const itemsList = items.map(i => `<tr><td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:${TEXT};">${esc(i.name)} <span style="color:${TEXT_3};">x${i.quantity}</span></td><td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:${TEXT};text-align:right;">${fmt(i.price * i.quantity)}</td></tr>`).join('');
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${BRAND};">${esc(buyerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Thank you for your purchase! Here's a summary of your order:</p>
  <div style="background:#1e1e28;border:1px solid ${BORDER};border-radius:12px;padding:20px 24px;margin-bottom:20px;">
    <div style="font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Order Reference</div>
    <div style="font-size:18px;font-weight:700;color:${BRAND};margin-top:4px;">#${esc(orderNumber)}</div>
  </div>
  <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Items</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead><tr><th style="text-align:left;padding:10px 16px;font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.1);">Product</th><th style="text-align:right;padding:10px 16px;font-size:12px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.1);">Price</th></tr></thead>
    <tbody>${itemsList}</tbody>
    <tfoot><tr style="font-weight:700;font-size:16px;color:${BRAND} !important;border-bottom:none !important;padding-top:14px;"><td style="padding:10px 16px;border-top:2px solid rgba(255,255,255,0.1);">Total Paid</td><td style="padding:10px 16px;border-top:2px solid rgba(255,255,255,0.1);text-align:right;">${fmt(totalAmount)}</td></tr></tfoot>
  </table>
  <p style="margin:0;font-size:14px;color:${TEXT_2};">Seller: <strong style="color:${TEXT};">${esc(storeName)}</strong></p>
  ${ctaButton(orderDetailsUrl, 'View Your Order', `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart(`Order confirmed #${orderNumber}`) +
    headerBlock('Order Confirmed', 'Your order has been confirmed!', `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

/* ═══════════════════════════════════════════════════════════════
   EMAIL SENDERS
═══════════════════════════════════════════════════════════════ */

export async function initializeEmailService(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY not set. Email sending will be disabled.');
    return;
  }
  resend = new Resend(apiKey);
  const customFrom = process.env.EMAIL_FROM;
  if (customFrom) fromAddress = customFrom;
  console.log(`✓ Email service initialized (Resend) — from: ${fromAddress}`);
}

export function getVerificationBaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return process.env.FRONTEND_URL || 'https://unimartx.com';
  }
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

export function getBackendBaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://unimartx.com';
  }
  return process.env.BACKEND_URL || 'http://localhost:5000';
}

async function sendMail(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  if (!resend) {
    console.warn(`[email] Resend not configured, skipping email to ${to}`);
    return false;
  }
  const devOverride = process.env.EMAIL_DEV_OVERRIDE;
  const recipient = devOverride || to;
  if (devOverride) console.log(`[email] DEV OVERRIDE: redirecting email from ${to} to ${devOverride}`);
  try {
    const { error } = await resend.emails.send({ from: fromAddress, to: recipient, subject, html, ...(replyTo ? { replyTo } : {}) });
    if (error) { console.error(`❌ Failed to send email to ${to}:`, error); return false; }
    console.log(`✓ Email sent to ${recipient}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return false;
  }
}

export async function sendVerificationEmail(toEmail: string, userName: string, verificationUrl: string): Promise<void> {
  await sendMail(toEmail, 'Verify Your Email - UnimartX', generateVerificationEmail(userName, verificationUrl));
}

export async function sendWelcomeEmail(toEmail: string, userName: string): Promise<void> {
  await sendMail(toEmail, 'Welcome to UnimartX!', generateWelcomeEmail(userName));
}

export async function sendPasswordResetEmail(toEmail: string, userName: string, resetUrl: string): Promise<void> {
  await sendMail(toEmail, 'Reset Your Password - UnimartX', generatePasswordResetEmail(userName, resetUrl));
}

export async function sendPasswordChangedEmail(toEmail: string, userName: string, frontendUrl: string): Promise<void> {
  await sendMail(toEmail, 'Your Password Was Changed - UnimartX', generatePasswordChangedEmail(userName, frontendUrl));
}

export async function sendSellerFollowedEmail(buyerEmail: string, buyerName: string, sellerName: string, sellerStoreUrl: string): Promise<void> {
  await sendMail(buyerEmail, `You're now following ${sellerName}`, generateSellerFollowedEmail(buyerName, sellerName, sellerStoreUrl));
}

export async function sendNewReviewEmail(sellerEmail: string, sellerName: string, reviewerName: string, productName: string, rating: number, comment: string | null, productId: string): Promise<void> {
  if (rating > 3) return;
  const productUrl = `${getVerificationBaseUrl()}/pages/public/shop/product-details.html?id=${productId}`;
  await sendMail(sellerEmail, `New ${rating}★ review on "${productName}"`, generateNewReviewEmail(sellerName, reviewerName, productName, rating, comment, productUrl));
}

export async function sendContactSellerEmail(sellerEmail: string, sellerName: string, buyerName: string, buyerEmail: string, message: string, sellerStoreUrl: string): Promise<void> {
  await sendMail(sellerEmail, `New message from ${buyerName} via UnimartX`, generateContactSellerEmail(sellerName, buyerName, buyerEmail, message, sellerStoreUrl));
}

export async function sendSupportContactEmail(toEmail: string, name: string, email: string, phone: string, subject: string, message: string): Promise<void> {
  const html = generateSupportContactEmail(name, email, phone, subject, message);
  const subjectLine = `[${subject.toUpperCase()}] Contact form — ${name}`;
  const ok = await sendMail(toEmail, subjectLine, html, email);
  if (!ok) throw new AppError('Failed to send support contact email', 500);
}

export async function sendSellerNewOrderEmail(sellerEmail: string, sellerName: string, orderNumber: string, items: { name: string; quantity: number; price: number }[], totalAmount: number, orderDetailsUrl: string, buyerName: string, buyerAddress: string): Promise<void> {
  await sendMail(sellerEmail, `New order received #${orderNumber}`, generateSellerNewOrderEmail(sellerName, orderNumber, items, totalAmount, orderDetailsUrl, buyerName, buyerAddress));
}

export async function sendBuyerOrderConfirmationEmail(buyerEmail: string, buyerName: string, orderNumber: string, items: { name: string; quantity: number; price: number }[], totalAmount: number, orderDetailsUrl: string, storeName: string): Promise<void> {
  await sendMail(buyerEmail, `Order confirmed #${orderNumber}`, generateBuyerOrderConfirmationEmail(buyerName, orderNumber, items, totalAmount, orderDetailsUrl, storeName));
}

export function generateBuyerOrderStatusEmail(buyerName: string, orderNumber: string, status: string, orderUrl: string, storeName: string): string { // orderUrl = /pages/buyer/orders/order-details.html?id=<orderId>
  const statusCopy: Record<string, { title: string; subtitle: string; body: string; color: string }> = {
    processing: { title: 'Order Processing', subtitle: 'Your order is being prepared', body: 'Your order is now being packed and prepared for dispatch. We\'ll notify you again once it\'s on its way.', color: '#f59e0b' },
    shipped:    { title: 'Order Shipped!', subtitle: 'Your order is on its way', body: 'Great news — your order has been dispatched and is on its way to you. Track your delivery with the button below.', color: '#6366f1' },
    delivered:  { title: 'Order Delivered', subtitle: 'Your order has arrived', body: 'Your order has been marked as delivered. We hope you enjoy your purchase! If there\'s any issue, please reach out to the seller or our support team.', color: '#10b981' },
    cancelled:  { title: 'Order Cancelled', subtitle: 'Your order has been cancelled', body: 'Unfortunately, your order has been cancelled. If you were charged, the refund will be processed within 3–5 business days.', color: '#ef4444' },
  };
  const s = statusCopy[status] || statusCopy.processing;
  const fmt = (n: number) => `GH₵ ${n.toFixed(2)}`;
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${BRAND};">${esc(buyerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};line-height:1.7;">${s.body}</p>
  ${ctaButton(orderUrl, status === 'shipped' ? 'Track Order' : 'View Order', `${BRAND_DARK}, ${BRAND}`)}
  <p style="margin:0;font-size:13px;color:${TEXT_3};">Store: <strong style="color:${TEXT};">${esc(storeName)}</strong> · Order #${esc(orderNumber)}</p>`;
  return wrapperStart(`Order ${status} #${orderNumber}`) +
    headerBlock(s.title, s.subtitle, `${s.color}, ${s.color}dd`) +
    body + footerBlock();
}

export function generateBuyerRefundStatusEmail(buyerName: string, orderNumber: string, status: string, orderUrl: string, note?: string): string {
  const statusCopy: Record<string, { title: string; subtitle: string; body: string; color: string }> = {
    seller_approved: { title: 'Refund Approved', subtitle: 'Seller agreed to your refund', body: 'Good news — the seller has approved your refund request. Your money will be returned to you shortly.', color: '#34d399' },
    seller_denied:   { title: 'Refund Update', subtitle: 'Seller reviewed your request', body: `The seller has reviewed your refund request. ${note || 'You can dispute this decision if you believe it\'s incorrect.'}`, color: '#f59e0b' },
    refunded:        { title: 'Refund Processed', subtitle: 'Your money is on its way', body: `Your refund has been processed. ${note || 'The funds should appear in your account within 3–5 business days, depending on your payment method.'}`, color: '#6366f1' },
    disputed:        { title: 'Dispute Submitted', subtitle: 'Admin is reviewing', body: 'Your dispute has been submitted and our admin team will review both sides. We\'ll update you once a decision is made.', color: '#8b5cf6' },
  };
  const s = statusCopy[status] || statusCopy.seller_approved;
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${BRAND};">${esc(buyerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};line-height:1.7;">${s.body}</p>
  ${ctaButton(orderUrl, 'View Order', `${BRAND_DARK}, ${BRAND}`)}
  ${note && status === 'seller_denied' ? `<p style="margin:16px 0 0;font-size:13px;color:${TEXT_3};line-height:1.6;">If you believe this decision is wrong, you can raise a dispute from the order page.</p>` : ''}`;
  return wrapperStart(`Refund update — Order #${orderNumber}`) +
    headerBlock(s.title, s.subtitle, `${s.color}, ${s.color}cc`) +
    body + footerBlock();
}

export function generateSellerRefundRequestedEmail(sellerName: string, orderNumber: string, buyerName: string, reason: string, message: string | null, orderUrl: string): string {
  const extra = message ? `<p style="margin:0 0 12px;font-size:14px;color:${TEXT_2};line-height:1.7;font-style:italic;">Note: ${esc(message)}</p>` : '';
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};"><strong style="color:${BRAND};">${esc(buyerName)}</strong> has requested a refund for Order #${esc(orderNumber)}.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Reason</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};line-height:1.7;">${esc(reason)}</p>
    ${extra}
  </td></tr>
  </table>
  <p style="margin:0 0 20px;font-size:15px;color:${TEXT_2};line-height:1.7;">Please review the request and respond from your order page. You can approve or deny the refund.</p>
  ${ctaButton(orderUrl, 'Review Refund Request', '#f59e0b, #fbbf24')}`;
  return wrapperStart(`Refund requested — Order #${orderNumber}`) +
    headerBlock('Refund Requested', 'A buyer wants a refund', '#f59e0b, #fbbf24') +
    body + footerBlock();
}

export function generateSellerRefundResponseEmail(sellerName: string, orderNumber: string, buyerName: string, response: 'approved' | 'denied', message: string, orderUrl: string): string {
  const isApprove = response === 'approved';
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">You <strong style="color:${isApprove ? '#34d399' : '#ef4444'};">${isApprove ? 'approved' : 'denied'}</strong> the refund request from <strong style="color:${BRAND};">${esc(buyerName)}</strong> for Order #${esc(orderNumber)}.</p>
  ${message ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px 24px;"><p style="margin:0;font-size:14px;color:${TEXT_2};line-height:1.6;">${esc(message)}</p></td></tr></table>` : ''}
  ${!isApprove ? `<p style="margin:0 0 20px;font-size:14px;color:${TEXT_3};line-height:1.6;">The buyer may now raise a dispute. Our team will review if they do.</p>` : `<p style="margin:0 0 20px;font-size:14px;color:${TEXT_3};line-height:1.6;">The refund will be processed to the buyer's original payment method.</p>`}
  ${ctaButton(orderUrl, 'View Order', `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart(`Refund ${response} — Order #${orderNumber}`) +
    headerBlock(`Refund ${isApprove ? 'Approved' : 'Denied'}`, `You responded to a refund request`, isApprove ? '#34d399, #10b981' : '#ef4444, #f87171') +
    body + footerBlock();
}

export function generateSellerRefundProcessedEmail(sellerName: string, orderNumber: string, amount: number, orderUrl: string): string {
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">The refund for Order #${esc(orderNumber)} (GH₵ ${amount.toFixed(2)}) has been fully processed. The funds have been returned to the buyer.</p>
  <p style="margin:0 0 20px;font-size:14px;color:${TEXT_3};line-height:1.6;">This amount will be deducted from your next payout. No action is needed from you.</p>
  ${ctaButton(orderUrl, 'View Order', `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart(`Refund processed — Order #${orderNumber}`) +
    headerBlock('Refund Completed', 'Funds returned to buyer', '#6366f1, #8b5cf6') +
    body + footerBlock();
}

export function generateSellerDisputeRaisedEmail(sellerName: string, orderNumber: string, buyerName: string, reason: string, orderUrl: string): string {
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};"><strong style="color:${BRAND};">${esc(buyerName)}</strong> has raised a dispute regarding the refund for Order #${esc(orderNumber)}.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Dispute Reason</p>
    <p style="margin:0;font-size:15px;color:${TEXT};line-height:1.7;">${esc(reason)}</p>
  </td></tr>
  </table>
  <p style="margin:0 0 20px;font-size:14px;color:#f59e0b;line-height:1.6;font-weight:700;">⚠️ Our admin team will review both sides and make a final decision. Please have your evidence ready.</p>
  ${ctaButton(orderUrl, 'View Order', '#f59e0b, #fbbf24')}`;
  return wrapperStart(`Dispute raised — Order #${orderNumber}`) +
    headerBlock('Dispute Raised', 'A buyer disputed your refund decision', '#ef4444, #f87171') +
    body + footerBlock();
}

export function generateBuyerDisputeResultEmail(buyerName: string, orderNumber: string, decision: 'approved' | 'denied', orderUrl: string, adminNote?: string): string {
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${BRAND};">${esc(buyerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};line-height:1.7;">Our admin team has reviewed your dispute for Order #${esc(orderNumber)} and has <strong style="color:${decision === 'approved' ? '#34d399' : '#ef4444'};">${decision === 'approved' ? 'upheld your claim' : 'denied your claim'}</strong>.</p>
  ${adminNote ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px 24px;"><p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Admin Note</p><p style="margin:0;font-size:14px;color:${TEXT_2};line-height:1.6;">${esc(adminNote)}</p></td></tr></table>` : ''}
  ${decision === 'approved' ? '<p style="margin:0 0 20px;font-size:14px;color:${TEXT_3};">The refund will be processed to your original payment method within 3–5 business days.</p>' : '<p style="margin:0 0 20px;font-size:14px;color:${TEXT_3};">The order has been restored to its previous status. If you have further concerns, please contact support.</p>'}
  ${ctaButton(orderUrl, 'View Order', `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart(`Dispute result — Order #${orderNumber}`) +
    headerBlock(`Dispute ${decision === 'approved' ? 'Upheld' : 'Denied'}`, 'Admin review complete', decision === 'approved' ? '#34d399, #10b981' : '#ef4444, #f87171') +
    body + footerBlock();
}

export function generateAdminDisputeAlertEmail(orderNumber: string, sellerName: string, buyerName: string, reason: string, orderUrl: string): string {
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">A buyer has raised a dispute on a refund decision. Your review is required.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Order</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">#${esc(orderNumber)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Seller</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">${esc(sellerName)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Buyer</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">${esc(buyerName)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Reason</p>
    <p style="margin:0;font-size:15px;color:${TEXT};line-height:1.6;">${esc(reason)}</p>
  </td></tr>
  </table>
  ${ctaButton(orderUrl, 'Review Dispute', '#ef4444, #f87171')}`;
  return wrapperStart('Admin Alert — Dispute Raised') +
    headerBlock('Dispute Requires Review', `Order #${orderNumber}`, '#ef4444, #f87171') +
    body + footerBlock();
}

export function generateAdminRefundAlertEmail(orderNumber: string, sellerName: string, amount: number, reason: string, orderUrl: string): string {
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">A refund has been processed and our team should be aware.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Order</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">#${esc(orderNumber)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Seller</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">${esc(sellerName)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Amount</p>
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">GH₵ ${amount.toFixed(2)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Reason</p>
    <p style="margin:0;font-size:15px;color:${TEXT};line-height:1.6;">${esc(reason)}</p>
  </td></tr>
  </table>
  ${ctaButton(orderUrl, 'View Order', '#f59e0b, #fbbf24')}`;
  return wrapperStart('Admin Alert — Refund Processed') +
    headerBlock('Refund Processed', `Order #${orderNumber}`, '#f59e0b, #fbbf24') +
    body + footerBlock();
}

export async function sendBuyerOrderStatusEmail(buyerEmail: string, buyerName: string, orderNumber: string, status: string, orderUrl: string, storeName: string): Promise<void> {
  await sendMail(buyerEmail, `Order ${status} #${orderNumber}`, generateBuyerOrderStatusEmail(buyerName, orderNumber, status, orderUrl, storeName));
}

export async function sendBuyerRefundStatusEmail(buyerEmail: string, buyerName: string, orderNumber: string, status: string, orderUrl: string, note?: string): Promise<void> {
  const subjectMap: Record<string, string> = {
    seller_approved: 'Refund approved for your order',
    seller_denied: 'Refund request update',
    refunded: 'Your refund has been processed',
    disputed: 'Your dispute is being reviewed',
  };
  await sendMail(buyerEmail, subjectMap[status] || `Refund update #${orderNumber}`, generateBuyerRefundStatusEmail(buyerName, orderNumber, status, orderUrl, note));
}

export async function sendSellerRefundRequestedEmail(sellerEmail: string, sellerName: string, orderNumber: string, buyerName: string, reason: string, message: string | null, orderUrl: string): Promise<void> {
  await sendMail(sellerEmail, `Refund request for Order #${orderNumber}`, generateSellerRefundRequestedEmail(sellerName, orderNumber, buyerName, reason, message, orderUrl));
}

export async function sendSellerRefundResponseEmail(sellerEmail: string, sellerName: string, orderNumber: string, buyerName: string, response: 'approved' | 'denied', message: string, orderUrl: string): Promise<void> {
  await sendMail(sellerEmail, `Refund ${response} — Order #${orderNumber}`, generateSellerRefundResponseEmail(sellerName, orderNumber, buyerName, response, message, orderUrl));
}

export async function sendSellerRefundProcessedEmail(sellerEmail: string, sellerName: string, orderNumber: string, amount: number, orderUrl: string): Promise<void> {
  await sendMail(sellerEmail, `Refund processed — Order #${orderNumber}`, generateSellerRefundProcessedEmail(sellerName, orderNumber, amount, orderUrl));
}

export async function sendSellerDisputeRaisedEmail(sellerEmail: string, sellerName: string, orderNumber: string, buyerName: string, reason: string, orderUrl: string): Promise<void> {
  await sendMail(sellerEmail, `Dispute raised — Order #${orderNumber}`, generateSellerDisputeRaisedEmail(sellerName, orderNumber, buyerName, reason, orderUrl));
}

export async function sendBuyerDisputeResultEmail(buyerEmail: string, buyerName: string, orderNumber: string, decision: 'approved' | 'denied', orderUrl: string, adminNote?: string): Promise<void> {
  await sendMail(buyerEmail, `Dispute ${decision} — Order #${orderNumber}`, generateBuyerDisputeResultEmail(buyerName, orderNumber, decision, orderUrl, adminNote));
}

export async function sendAdminDisputeAlertEmail(adminEmail: string, orderNumber: string, sellerName: string, buyerName: string, reason: string, orderUrl: string): Promise<void> {
  await sendMail(adminEmail, `Admin alert: Dispute on Order #${orderNumber}`, generateAdminDisputeAlertEmail(orderNumber, sellerName, buyerName, reason, orderUrl));
}

export async function sendAdminRefundAlertEmail(adminEmail: string, orderNumber: string, sellerName: string, amount: number, reason: string, orderUrl: string): Promise<void> {
  await sendMail(adminEmail, `Admin alert: Refund processed — Order #${orderNumber}`, generateAdminRefundAlertEmail(orderNumber, sellerName, amount, reason, orderUrl));
}

export function generateLowStockEmail(sellerName: string, productName: string, stock: number, productUrl: string): string {
  const urgency = stock === 0 ? 'Out of Stock' : 'Low Stock';
  const color   = stock === 0 ? '#ef4444' : '#f59e0b';
  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Your product <strong style="color:${color};">${esc(productName)}</strong> is running ${stock === 0 ? 'out of stock' : 'low on stock'}.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_3};border:1px solid ${BORDER};border-radius:12px;margin-bottom:28px;">
  <tr><td style="padding:24px;text-align:center;">
    <p style="margin:0 0 6px;font-size:13px;color:${TEXT_3};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Units Remaining</p>
    <p style="margin:0;font-size:42px;font-weight:700;color:${color};line-height:1;">${stock}</p>
  </td></tr>
  </table>
  <p style="margin:0 0 24px;font-size:14px;color:${TEXT_2};line-height:1.7;">Restock soon to avoid missing sales. Update your inventory from the product details page.</p>
  ${ctaButton(productUrl, 'Update Stock Now', `${color}, ${color}cc`)}
  <p style="margin:0;font-size:13px;color:${TEXT_3};">You're receiving this because stock alerts are enabled for your store.</p>`;
  return wrapperStart(`${urgency}: "${productName}"`) +
    headerBlock(`${urgency} Alert`, `"${esc(productName)}" needs your attention`, `${color}, ${color}cc`) +
    body + footerBlock();
}

export async function sendLowStockEmail(sellerEmail: string, sellerName: string, productName: string, stock: number, productId: string): Promise<void> {
  const productUrl = `${getVerificationBaseUrl()}/pages/seller/private/products/product-details.html#id=${productId}`;
  const urgency = stock === 0 ? 'Out of Stock' : 'Low Stock';
  await sendMail(sellerEmail, `${urgency}: "${productName}" — ${stock} unit${stock === 1 ? '' : 's'} left`, generateLowStockEmail(sellerName, productName, stock, productUrl));
}

export function generateSellerDigestEmail(sellerName: string, events: { type: string; detail: string; url?: string; time?: Date }[]): string {
  const grouped: Record<string, typeof events> = {};
  events.forEach(e => {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e);
  });

  const sections = Object.entries(grouped).map(([type, evts]) => {
    const items = evts.map(e => {
      const time = e.time ? new Date(e.time).toLocaleString() : '';
      return `<tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT};line-height:1.6;">${esc(e.detail)}<br><span style="font-size:12px;color:${TEXT_3};">${time}</span></td></tr>`;
    }).join('');
    return `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:0.06em;">${type} (${evts.length})</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:${BG_3};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">${items}</table>`;
  }).join('');

  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Hi <strong style="color:${TEXT};">${esc(sellerName)}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:${TEXT_2};">Here's what happened on your store today:</p>
  ${sections}
  ${ctaButton(`${getVerificationBaseUrl()}/pages/seller/private/dashboard/overview.html`, 'View Dashboard', `${BRAND_DARK}, ${BRAND}`)}`;
  return wrapperStart('Your Daily Store Summary') +
    headerBlock('Daily Summary', `Your store at a glance — ${new Date().toLocaleDateString()}`, `${BRAND_DARK}, ${BRAND}`) +
    body + footerBlock();
}

export async function sendSellerDigestEmail(sellerEmail: string, sellerName: string, events: { type: string; detail: string; url?: string; time?: Date }[]): Promise<void> {
  if (events.length === 0) return;
  const html = generateSellerDigestEmail(sellerName, events);
  await sendMail(sellerEmail, `Your Daily Store Summary — ${events.length} updates`, html);
}
