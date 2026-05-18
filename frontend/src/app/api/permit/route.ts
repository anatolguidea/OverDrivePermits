import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PermitRequest } from '@/types/permit.types';
import { formatPhoneNumber } from '@/utils/formatPhone';
import { logger } from '@/lib/observability/logger';

// Helper function to escape HTML to prevent XSS
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Email service configuration
const createTransporter = () => {
  // Validate required environment variables
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error(
      'SMTP configuration is incomplete. Please check your environment variables: SMTP_USER, SMTP_PASS'
    );
  }

  // Auto-detect Gmail if SMTP_HOST is not set and user is a Gmail address
  const smtpHost = process.env.SMTP_HOST || (smtpUser.includes('@gmail.com') ? 'smtp.gmail.com' : null);
  
  if (!smtpHost) {
    throw new Error(
      'SMTP_HOST is required. Please set SMTP_HOST in your environment variables, or use a Gmail account.'
    );
  }

  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const isSecure = smtpPort === 465 || process.env.SMTP_SECURE === 'true';

  // For Gmail, use service option
  if (smtpHost.includes('gmail.com') || smtpUser.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Note: Gmail may override the "from" address if it's not verified in Gmail settings
      // To use a custom "from" address, configure "Send mail as" in Gmail account settings
    });
  }

  // For other SMTP providers
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Add TLS options for better compatibility
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  } as nodemailer.TransportOptions);
};

// Verify SMTP connection (optional - some servers don't support verify)
const verifyTransporter = async (transporter: nodemailer.Transporter): Promise<void> => {
  try {
    await transporter.verify();
  } catch (error: any) {
    logger.warn('smtp verification failed', { error: error.message });
  }
};

// Generate admin email template (enhanced with better branding)
const generateAdminEmailTemplate = (data: PermitRequest): string => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1F2937; 
            background-color: #F9FAFB;
          }
          .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #FFFFFF;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #DC143C 0%, #B71C1C 100%); 
            color: white; 
            padding: 32px 24px; 
            text-align: center;
          }
          .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.02em;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
          }
          .content { 
            padding: 24px 20px; 
            background: #FFFFFF;
          }
          .section {
            margin-bottom: 16px;
          }
          .section:last-child {
            margin-bottom: 0;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #1E3A8A;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #E5E7EB;
          }
          .fields-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .fields-table td {
            padding: 8px 10px;
            background: #F9FAFB;
            border-left: 3px solid #1E3A8A;
            vertical-align: top;
          }
          .fields-table td:first-child {
            border-left: 3px solid #1E3A8A;
          }
          .field-cell {
            padding: 8px 10px;
            background: #F9FAFB;
            border-left: 3px solid #1E3A8A;
          }
          .label { 
            font-weight: 600; 
            color: #374151;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
            display: block;
          }
          .value { 
            color: #1F2937;
            font-size: 14px;
            word-break: break-word;
            display: block;
          }
          .footer {
            background: #F9FAFB;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            color: #6B7280;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🚛 New Permit Request</h1>
            <p>OVERDRIVE PERMITS</p>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">Customer Information</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="field-cell" width="50%">
                    <span class="label">Full Name</span>
                    <span class="value">${escapeHtml(data.customerName || '')}</span>
                  </td>
                  <td class="field-cell" width="50%">
                    <span class="label">Phone Number</span>
                    <span class="value">${escapeHtml(formatPhoneNumber(data.phone))}</span>
                  </td>
                </tr>
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">Email Address</span>
                    <span class="value">${escapeHtml(data.email || '')}</span>
                  </td>
                </tr>
                ${data.companyName ? `
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">Company Name</span>
                    <span class="value">${escapeHtml(data.companyName)}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${data.origin || data.destination || data.state ? `
            <div class="section">
              <div class="section-title">Route Information</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${data.origin || data.destination ? `
                <tr>
                  ${data.origin ? `
                  <td class="field-cell" width="50%">
                    <span class="label">Origin</span>
                    <span class="value">${escapeHtml(data.origin || '')}</span>
                  </td>
                  ` : ''}
                  ${data.destination ? `
                  <td class="field-cell" width="50%">
                    <span class="label">Destination</span>
                    <span class="value">${escapeHtml(data.destination || '')}</span>
                  </td>
                  ` : ''}
                </tr>
                ` : ''}
                ${data.avoidHighways !== undefined ? `
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">Route Type</span>
                    <span class="value">${data.avoidHighways === '0' ? 'Interstate' : 'Non-Interstate'}</span>
                  </td>
                </tr>
                ` : ''}
                ${data.selectedStates && data.selectedStates.length > 0 ? `
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">Selected States</span>
                    <span class="value">${data.selectedStates.map(state => escapeHtml(state)).join(', ')}</span>
                  </td>
                </tr>
                ` : ''}
                ${data.state ? `
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">State</span>
                    <span class="value">${escapeHtml(data.state || '')}</span>
                  </td>
                </tr>
                ` : ''}
                ${data.permitType ? `
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">Permit Type</span>
                    <span class="value">${data.permitType.charAt(0).toUpperCase() + data.permitType.slice(1)}</span>
                  </td>
                </tr>
                ` : ''}
                ${data.route ? `
                <tr>
                  <td class="field-cell" colspan="2">
                    <span class="label">Route</span>
                    <span class="value">${escapeHtml(data.route || '')}</span>
                  </td>
                </tr>
                ` : ''}
                ${data.startDate || data.endDate ? `
                <tr>
                  ${data.startDate ? `
                  <td class="field-cell" width="50%">
                    <span class="label">Start Date</span>
                    <span class="value">${formatDate(data.startDate)}</span>
                  </td>
                  ` : ''}
                  ${data.endDate ? `
                  <td class="field-cell" width="50%">
                    <span class="label">End Date</span>
                    <span class="value">${formatDate(data.endDate)}</span>
                  </td>
                  ` : ''}
                </tr>
                ` : ''}
              </table>
            </div>
            ` : ''}
            
            ${data.commodityLength || data.commodityWidth || data.commodityHeight || data.commodityWeight ? `
            <div class="section">
              <div class="section-title">Load Dimensions</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${data.commodityLength ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Length</span>
                    <span class="value">${escapeHtml(data.commodityLength || '')}</span>
                  </td>
                  ` : ''}
                  ${data.commodityWidth ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Width</span>
                    <span class="value">${escapeHtml(data.commodityWidth || '')}</span>
                  </td>
                  ` : ''}
                  ${data.commodityHeight ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Height</span>
                    <span class="value">${escapeHtml(data.commodityHeight || '')}</span>
                  </td>
                  ` : ''}
                  ${data.commodityWeight ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Weight</span>
                    <span class="value">${escapeHtml(data.commodityWeight || '')}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </div>
            ` : ''}
            
            ${data.tractorTrailerDisplayName || data.numberOfAxles ? `
            <div class="section">
              <div class="section-title">Equipment</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${data.tractorTrailerDisplayName ? `
                  <td class="field-cell" width="70%">
                    <span class="label">Tractor & Trailer</span>
                    <span class="value">${escapeHtml(data.tractorTrailerDisplayName || '')}</span>
                  </td>
                  ` : ''}
                  ${data.numberOfAxles ? `
                  <td class="field-cell" width="30%">
                    <span class="label">Number of Axles</span>
                    <span class="value">${escapeHtml(data.numberOfAxles || '')}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </div>
            ` : ''}
            
            ${data.length || data.width || data.height || data.weightGross ? `
            <div class="section">
              <div class="section-title">Overall Dimensions</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${data.length ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Length</span>
                    <span class="value">${escapeHtml(data.length || '')}</span>
                  </td>
                  ` : ''}
                  ${data.width ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Width</span>
                    <span class="value">${escapeHtml(data.width || '')}</span>
                  </td>
                  ` : ''}
                  ${data.height ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Height</span>
                    <span class="value">${escapeHtml(data.height || '')}</span>
                  </td>
                  ` : ''}
                  ${data.weightGross ? `
                  <td class="field-cell" width="25%">
                    <span class="label">Weight</span>
                    <span class="value">${escapeHtml(data.weightGross || '')}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </div>
            ` : ''}
            
            ${data.overhangFront || data.overhangRear || data.kingpin ? `
            <div class="section">
              <div class="section-title">Extra Fields</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${data.overhangFront ? `
                  <td class="field-cell" width="33.33%">
                    <span class="label">Overhang Front</span>
                    <span class="value">${escapeHtml(data.overhangFront || '')}</span>
                  </td>
                  ` : ''}
                  ${data.overhangRear ? `
                  <td class="field-cell" width="33.33%">
                    <span class="label">Overhang Rear</span>
                    <span class="value">${escapeHtml(data.overhangRear || '')}</span>
                  </td>
                  ` : ''}
                  ${data.kingpin ? `
                  <td class="field-cell" width="33.33%">
                    <span class="label">Kingpin</span>
                    <span class="value">${escapeHtml(data.kingpin || '')}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </div>
            ` : ''}
            
            ${data.promoCode ? `
            <div class="section">
              <div class="section-title">Promo Code</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="field-cell">
                    <span class="label">Promo Code</span>
                    <span class="value">${escapeHtml(data.promoCode || '')}</span>
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}
            
            ${data.cargoWeight || data.cargoDimensions || data.cargoType ? `
            <div class="section">
              <div class="section-title">Cargo Information</div>
              <table class="fields-table" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${data.cargoWeight ? `
                  <td class="field-cell" width="33.33%">
                    <span class="label">Weight</span>
                    <span class="value">${escapeHtml(data.cargoWeight || '')}</span>
                  </td>
                  ` : ''}
                  ${data.cargoDimensions ? `
                  <td class="field-cell" width="33.33%">
                    <span class="label">Dimensions</span>
                    <span class="value">${escapeHtml(data.cargoDimensions || '')}</span>
                  </td>
                  ` : ''}
                  ${data.cargoType ? `
                  <td class="field-cell" width="33.33%">
                    <span class="label">Cargo Type</span>
                    <span class="value">${escapeHtml(data.cargoType || '')}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </div>
            ` : ''}
            
            ${data.notes ? `
            <div class="section">
              <div class="section-title">Additional Notes</div>
            <div class="field">
              <div class="value">${escapeHtml(data.notes || '')}</div>
              </div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from OVERDRIVE PERMITS</p>
            <p style="margin-top: 8px;">Please respond to this request as soon as possible.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Generate user confirmation email template
const generateUserConfirmationTemplate = (data: PermitRequest): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1F2937; 
            background-color: #F9FAFB;
          }
          .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #FFFFFF;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #DC143C 0%, #B71C1C 100%); 
            color: white; 
            padding: 40px 24px; 
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
          }
          .header p {
            font-size: 16px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 24px; 
            background: #FFFFFF;
          }
          .success-icon {
            text-align: center;
            font-size: 64px;
            margin-bottom: 24px;
          }
          .message {
            text-align: center;
            margin-bottom: 32px;
          }
          .message h2 {
            font-size: 22px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 12px;
          }
          .message p {
            font-size: 16px;
            color: #6B7280;
            line-height: 1.7;
          }
          .details-box {
            background: #F9FAFB;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #E5E7EB;
          }
          .details-box h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1E3A8A;
            margin-bottom: 16px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #E5E7EB;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 500;
            color: #6B7280;
            font-size: 14px;
          }
          .detail-value {
            font-weight: 600;
            color: #1F2937;
            font-size: 14px;
            text-align: right;
          }
          .cta-box {
            background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%);
            color: white;
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 32px;
          }
          .cta-box h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .cta-box p {
            font-size: 14px;
            opacity: 0.9;
          }
          .footer {
            background: #F9FAFB;
            padding: 32px 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
          }
          .footer p {
            color: #6B7280;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .footer a {
            color: #1E3A8A;
            text-decoration: none;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Thank You, ${escapeHtml(data.customerName || '')}!</h1>
            <p>Your permit request has been received</p>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <div class="message">
              <h2>Request Submitted Successfully</h2>
              <p>We&apos;ve received your permit request and our team will review it shortly. You can expect to hear from us within 1-3 business days.</p>
            </div>
            
            <div class="details-box">
              <h3>Request Summary</h3>
              ${data.origin && data.destination ? `
              <div class="detail-row">
                <span class="detail-label">Route:</span>
                <span class="detail-value">${escapeHtml(data.origin || '')} → ${escapeHtml(data.destination || '')}</span>
              </div>
              ` : ''}
              ${data.state ? `
              <div class="detail-row">
                <span class="detail-label">State:</span>
                <span class="detail-value">${escapeHtml(data.state || '')}</span>
              </div>
              ` : ''}
              ${data.permitType ? `
              <div class="detail-row">
                <span class="detail-label">Permit Type:</span>
                <span class="detail-value">${data.permitType.charAt(0).toUpperCase() + data.permitType.slice(1)}</span>
              </div>
              ` : ''}
              ${data.tractorTrailerDisplayName ? `
              <div class="detail-row">
                <span class="detail-label">Equipment:</span>
                <span class="detail-value">${escapeHtml(data.tractorTrailerDisplayName || '')}</span>
              </div>
              ` : ''}
              ${data.route ? `
              <div class="detail-row">
                <span class="detail-label">Route:</span>
                <span class="detail-value">${escapeHtml(data.route || '')}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="cta-box">
              <h3>What&apos;s Next?</h3>
              <p>Our permit specialists will review your request and contact you with a quote and next steps. If you have any questions, feel free to reach out to us.</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>OVERDRIVE PERMITS</strong></p>
            <p>Your trusted partner for trucking permits across all 50 US states</p>
            <p style="margin-top: 16px;">
              <a href="mailto:admin@overdrivepermits.com">Contact Us</a> | 
              <a href="#">View Our Website</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const data: PermitRequest = await request.json();

    // Basic validation - require contact info and either state OR origin/destination
    if (!data.customerName || !data.email || !data.phone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Require either state (old form) or origin/destination (new form)
    if (!data.state && (!data.origin || !data.destination)) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: please provide either state or origin/destination' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate SMTP configuration
    let transporter: nodemailer.Transporter;
    try {
      transporter = createTransporter();
      // Try to verify SMTP connection (non-blocking)
      await verifyTransporter(transporter);
    } catch (configError: any) {
      logger.error('smtp configuration error', {
        error: configError?.message ?? 'unknown',
      });
      return NextResponse.json(
        {
          success: false,
          message: configError.message || 'Email service is not properly configured. Please check your SMTP settings.',
        },
        { status: 500 }
      );
    }

    // Use QUOTE_EMAIL if available, otherwise ADMIN_EMAIL, otherwise default
    const adminEmail = process.env.QUOTE_EMAIL || process.env.ADMIN_EMAIL || 'admin@overdrivepermits.com';
    
    // Prioritize SMTP_FROM over SMTP_USER for the "from" address
    // IMPORTANT: When using Gmail SMTP, Gmail may override the "from" address 
    // unless the address is verified in Gmail's "Send mail as" settings
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@overdrivepermits.com';
    const fromName = process.env.SMTP_FROM_NAME || 'OVERDRIVE PERMITS';

    // Format from address with name
    // Use the format: "Name <email@domain.com>" for better email client support
    const fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    
    // Log the from address being used (for debugging)
    if (process.env.NODE_ENV === 'development') {
      logger.info('permit email sender resolved', {
        fromAddress,
        smtp_from: process.env.SMTP_FROM ?? null,
        smtp_user: process.env.SMTP_USER ?? null,
      });
    }

    // Send admin notification email
    try {
    await transporter.sendMail({
        from: fromAddress,
      to: adminEmail,
        replyTo: data.email,
        subject: data.origin && data.destination 
          ? `New Quote Request - ${escapeHtml(data.origin || '')} to ${escapeHtml(data.destination || '')}`
          : `New Permit Request - ${data.state ? escapeHtml(data.state || '') : 'N/A'} - ${data.permitType ? data.permitType.charAt(0).toUpperCase() + data.permitType.slice(1) : 'Quote'}`,
      html: generateAdminEmailTemplate(data),
    });
    } catch (adminEmailError: any) {
      logger.error('admin notification email failed', {
        error: adminEmailError?.message ?? 'unknown',
        code: adminEmailError?.code ?? 'UNKNOWN',
      });
      const errorMessage = adminEmailError.message || 'Unknown error';
      const errorCode = adminEmailError.code || 'UNKNOWN';
      
      // Provide more helpful error messages
      let userMessage = 'Failed to send notification email. ';
      if (errorCode === 'EAUTH') {
        userMessage += 'SMTP authentication failed. Please check your SMTP_USER and SMTP_PASS.';
      } else if (errorCode === 'ECONNECTION') {
        userMessage += 'Could not connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT.';
      } else if (errorMessage.includes('Invalid login')) {
        userMessage += 'Invalid email credentials. Please check your SMTP_USER and SMTP_PASS.';
      } else {
        userMessage += errorMessage;
      }
      
      return NextResponse.json(
        {
          success: false,
          message: userMessage,
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    // Send user confirmation email
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: data.email,
        subject: 'Quote Request Received - OVERDRIVE PERMITS',
        html: generateUserConfirmationTemplate(data),
      });
    } catch (userEmailError: any) {
      // Log error but don't fail the request if user email fails
      // Admin email was sent successfully, so we consider the request processed
      logger.warn('user confirmation email failed', {
        error: userEmailError?.message ?? 'unknown',
        code: userEmailError?.code ?? 'UNKNOWN',
      });
      // Still return success since admin was notified
    }

    return NextResponse.json({
      success: true,
      message: 'Permit request submitted successfully',
    });
  } catch (error: any) {
    logger.error('permit submission failed', {
      error: error?.message ?? 'unknown',
      stack: error?.stack ?? null,
    });
    
    // Provide more detailed error information
    let errorMessage = 'Failed to submit permit request. ';
    if (error.message) {
      if (error.message.includes('SMTP')) {
        errorMessage += 'SMTP configuration error: ' + error.message;
      } else {
        errorMessage += error.message;
      }
    } else {
      errorMessage += 'Please check your email configuration and try again.';
    }
    
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
