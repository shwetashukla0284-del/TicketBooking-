import nodemailer from 'nodemailer';
import { generateQRCodeDataUrl } from './qrService';

export interface SendTicketEmailParams {
  toEmail: string;
  customerName: string;
  bookingReference: string;
  eventTitle: string;
  venueName: string;
  showTime: string;
  seats: string[]; // e.g. ["Row A - Seat 1", "Row A - Seat 2"]
  totalAmount: number;
}

export async function sendTicketConfirmationEmail(params: SendTicketEmailParams): Promise<boolean> {
  const { toEmail, customerName, bookingReference, eventTitle, venueName, showTime, seats, totalAmount } = params;

  try {
    let transporter: nodemailer.Transporter;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      // Create a test account automatically via Ethereal for zero-config testing
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const qrDataUrl = await generateQRCodeDataUrl(bookingReference);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 30px; }
          .ticket-card { background: #0f172a; border-radius: 12px; padding: 20px; border: 1px dashed #475569; margin: 20px 0; text-align: center; }
          .qr-img { width: 180px; height: 180px; margin: 15px auto; display: block; border-radius: 8px; border: 4px solid #ffffff; }
          .ref-code { font-family: monospace; font-size: 20px; color: #38bdf8; font-weight: bold; letter-spacing: 2px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .details-table td { padding: 10px 0; border-bottom: 1px solid #334155; }
          .label { color: #94a3b8; font-size: 14px; }
          .value { color: #f1f5f9; font-weight: 600; text-align: right; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎟️ Booking Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${customerName}</strong>,</p>
            <p>Thank you for your booking! Your tickets for <strong>${eventTitle}</strong> are ready.</p>
            
            <div class="ticket-card">
              <div class="label">BOOKING REFERENCE</div>
              <div class="ref-code">${bookingReference}</div>
              <img src="${qrDataUrl}" alt="QR Ticket Code" class="qr-img" />
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Show this QR code at the venue gate for instant check-in</p>
            </div>

            <table class="details-table">
              <tr>
                <td class="label">Event</td>
                <td class="value">${eventTitle}</td>
              </tr>
              <tr>
                <td class="label">Venue</td>
                <td class="value">${venueName}</td>
              </tr>
              <tr>
                <td class="label">Show Time</td>
                <td class="value">${showTime}</td>
              </tr>
              <tr>
                <td class="label">Seats</td>
                <td class="value">${seats.join(', ')}</td>
              </tr>
              <tr>
                <td class="label">Total Paid</td>
                <td class="value" style="color: #4ade80;">$${totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            Ticket Booking System Platform &copy; 2026. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Ticket Booking System" <${process.env.EMAIL_FROM || 'tickets@ticketbooking.com'}>`,
      to: toEmail,
      subject: `Your Digital Ticket: ${eventTitle} (${bookingReference})`,
      html: htmlContent,
    });

    if (nodemailer.getTestMessageUrl(info)) {
      console.log('📧 Ethereal Email Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    return false;
  }
}
