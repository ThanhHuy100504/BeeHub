const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

// Project URL
const SUPABASE_URL = process.env.SUPABASE_URL || '';

// Anon public key
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Service role secret key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Database URL
const DATABASE_URL = process.env.DATABASE_URL || '';

// Cloudinary (for image uploads)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'beehub_preset';

// PayOS — Merchant API v2: https://api-merchant.payos.vn/v2
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '';
const PAYOS_API_URL = process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn/v2';

// Application URLs — APP_URL = frontend web; API_URL = backend (PayOS return callback)
const WEB_DEV_URL = process.env.WEB_DEV_URL || 'https://move.bachhoaseeding.com';
const APP_URL = process.env.APP_URL || WEB_DEV_URL;
const API_URL = process.env.API_URL || APP_URL;

// Goong Maps (ưu tiên cho địa chỉ VN) — https://docs.goong.io/rest/
const GOONG_API_KEY = process.env.GOONG_API_KEY || '';
const GOONG_API_URL = process.env.GOONG_API_URL || 'https://rsapi.goong.io';

// Google Maps (fallback)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Google Sign-In — OAuth Web client ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Node API
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Email configuration (Gmail for password reset OTP)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || false;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';
const PASSWORD_RESET_OTP_EXPIRES_MINUTES = process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 10;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** Nested SMTP — dùng bởi mail.service.js */
const smtp = {
  host: SMTP_HOST,
  port: parseInt(String(SMTP_PORT), 10) || 587,
  secure: SMTP_SECURE,
  user: SMTP_USER,
  pass: SMTP_PASS,
  from: SMTP_FROM || SMTP_USER,
  get isConfigured() {
    return Boolean(this.host && this.user && this.pass);
  },
};

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_PRESET,
  PAYOS_CLIENT_ID,
  PAYOS_API_KEY,
  PAYOS_CHECKSUM_KEY,
  PAYOS_API_URL,
  APP_URL,
  API_URL,
  GOONG_API_KEY,
  GOONG_API_URL,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_CLIENT_ID,
  PORT,
  NODE_ENV,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  PASSWORD_RESET_OTP_EXPIRES_MINUTES,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  smtp,
};
