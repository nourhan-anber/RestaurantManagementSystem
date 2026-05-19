import crypto from 'crypto';

// Use environment variable, fallback to a hardcoded secret for dev (NOT FOR PROD)
const SECRET_KEY = process.env.TABLE_SECRET_KEY || 'default-dev-secret-key-do-not-use-in-prod';

/**
 * Generates an HMAC signature for a specific table number.
 * @param {string|number} tableNumber 
 * @returns {string} The hex encoded HMAC token
 */
export const generateTableToken = (tableNumber) => {
  if (!tableNumber) throw new Error('Table number is required to generate token');
  
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`table_${tableNumber}`)
    .digest('hex');
};

/**
 * Verifies if the provided token matches the valid token for the table number.
 * Uses timingSafeEqual to prevent timing attacks.
 * @param {string|number} tableNumber 
 * @param {string} token 
 * @returns {boolean} True if valid, false otherwise
 */
export const verifyTableToken = (tableNumber, token) => {
  if (!tableNumber || !token) return false;

  try {
    const expectedToken = generateTableToken(tableNumber);
    const expectedBuffer = Buffer.from(expectedToken, 'hex');
    const providedBuffer = Buffer.from(token, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    // Return false if token is not a valid hex string or other errors occur
    return false;
  }
};
