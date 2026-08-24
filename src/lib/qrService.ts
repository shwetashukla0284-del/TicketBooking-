import QRCode from 'qrcode';

/**
 * Generates a PNG Base64 Data URL for a booking reference QR Code.
 */
export async function generateQRCodeDataUrl(bookingReference: string): Promise<string> {
  try {
    return await QRCode.toDataURL(bookingReference, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code DataURL:', err);
    throw new Error('QR_GENERATION_FAILED');
  }
}

/**
 * Generates an SVG String for rendering on web pages.
 */
export async function generateQRCodeSVG(bookingReference: string): Promise<string> {
  try {
    return await QRCode.toString(bookingReference, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
    });
  } catch (err) {
    console.error('Failed to generate QR Code SVG:', err);
    throw new Error('QR_GENERATION_FAILED');
  }
}
