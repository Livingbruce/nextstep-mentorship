import pool from "../db/pool.js";
import fetch from "node-fetch";

// M-Pesa Daraja API configuration
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY?.trim();
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET?.trim();
const MPESA_PASSKEY = process.env.MPESA_PASSKEY?.trim();
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE?.trim(); // Paybill number: 522522
const MPESA_BASE_URL = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke"; // Use production URL when ready

// Account details
const ACCOUNT_NAME = process.env.BANK_ACCOUNT_NAME?.trim() || "Desol Nurturers";
const ACCOUNT_NUMBER = process.env.BANK_ACCOUNT_NUMBER?.trim() || "1343210186";
const PAYBILL_NUMBER = process.env.MPESA_SHORTCODE?.trim() || "522522";

/**
 * Generate M-Pesa access token
 */
async function getMpesaAccessToken() {
  try {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
    
    const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting M-Pesa access token:", error.message);
    throw new Error("Failed to authenticate with M-Pesa API");
  }
}

/**
 * Generate M-Pesa password (base64 encoded timestamp + shortcode + passkey)
 */
function generateMpesaPassword() {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");
  return { password, timestamp };
}

/**
 * Initiate M-Pesa STK Push (Paybill)
 * @param {string} phoneNumber - Customer phone number (format: 254712345678)
 * @param {number} amount - Amount in KES
 * @param {string} accountReference - Unique reference (appointment code, order ID, etc.)
 * @param {string} transactionDesc - Transaction description
 * @returns {Promise<Object>} STK push response
 */
export async function initiateMpesaSTKPush(phoneNumber, amount, accountReference, transactionDesc = "Payment") {
  // Check if M-Pesa credentials are configured
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_PASSKEY || !MPESA_SHORTCODE) {
    const error = new Error("M-Pesa credentials not configured");
    error.code = "MPESA_NOT_CONFIGURED";
    error.details = "Please set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, and MPESA_SHORTCODE environment variables in Vercel.";
    throw error;
  }

  try {

    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "254" + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith("254")) {
      normalizedPhone = "254" + normalizedPhone;
    }

    const accessToken = await getMpesaAccessToken();
    const { password, timestamp } = generateMpesaPassword();

    const stkPushUrl = `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`;
    
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.API_URL || process.env.LOCAL_API_URL}/api/payments/mpesa/callback`;

    const requestBody = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: normalizedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const response = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.ResponseCode === "0") {
      return {
        success: true,
        checkoutRequestID: data.CheckoutRequestID,
        customerMessage: data.CustomerMessage,
        merchantRequestID: data.MerchantRequestID,
      };
    } else {
      throw new Error(data.CustomerMessage || "STK push failed");
    }
  } catch (error) {
    console.error("Error initiating M-Pesa STK push:", error.message);
    throw error;
  }
}

/**
 * Verify M-Pesa payment status
 * @param {string} checkoutRequestID - Checkout request ID from STK push
 * @returns {Promise<Object>} Payment status
 */
export async function verifyMpesaPayment(checkoutRequestID) {
  try {
    const accessToken = await getMpesaAccessToken();
    const { password, timestamp } = generateMpesaPassword();

    const queryUrl = `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`;
    
    const requestBody = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID,
    };

    const response = await fetch(queryUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return {
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
      merchantRequestID: data.MerchantRequestID,
      checkoutRequestID: data.CheckoutRequestID,
    };
  } catch (error) {
    console.error("Error verifying M-Pesa payment:", error.message);
    throw error;
  }
}

/**
 * Get account details for display
 */
export function getAccountDetails() {
  return {
    accountName: ACCOUNT_NAME,
    accountNumber: ACCOUNT_NUMBER,
    paybillNumber: PAYBILL_NUMBER,
  };
}

/**
 * Build manual payment guide for clients
 * @param {string} reference - Appointment code or order reference
 */
export function getManualPaymentGuide(reference = "your appointment code") {
  const instructionsReference = reference || "your appointment code";
  return {
    mpesa: {
      title: "M-Pesa Paybill",
      paybill: PAYBILL_NUMBER,
      accountReference: instructionsReference,
      steps: [
        "Open the M-Pesa app or dial *334#",
        `Select Lipa na M-Pesa > Paybill and enter business number ${PAYBILL_NUMBER}`,
        `Use ${instructionsReference} as the account/reference number`,
        "Enter the amount shared in your booking confirmation",
        "Complete the payment and keep the M-Pesa confirmation message",
      ],
      note: "If you receive our STK push, simply confirm on your phone. Otherwise pay manually using the instructions above.",
    },
    bank: {
      title: "Bank Transfer (Manual)",
      accountName: ACCOUNT_NAME,
      accountNumber: ACCOUNT_NUMBER,
      instructions: [
        "Use your mobile banking app or visit a bank agent to send the funds",
        `Account Name: ${ACCOUNT_NAME}`,
        `Account Number: ${ACCOUNT_NUMBER}`,
        `Use ${instructionsReference} or your full name as the payment reference`,
        "Keep the transaction confirmation (screenshot or reference code) and share it with our team for verification",
      ],
      note: "Bank transfers are verified manually within working hours. Please send the transaction reference after payment so that we can confirm your session.",
    },
  };
}

/**
 * Mark payment as paid in database
 * @param {string} reference - Appointment code or order ID
 * @param {string} paymentMethod - Payment method used
 * @param {string} transactionId - Transaction ID from payment gateway
 * @param {string} referenceType - 'appointment' or 'order'
 */
export async function markPaymentAsPaid(reference, paymentMethod, transactionId, referenceType = "appointment") {
  try {
    if (referenceType === "appointment") {
      // Update appointment payment status
      const result = await pool.query(
        `UPDATE appointments 
         SET payment_status = 'paid', 
             status = CASE WHEN status = 'pending_payment' THEN 'confirmed' ELSE status END,
             updated_at = NOW()
         WHERE appointment_code = $1
         RETURNING id, appointment_code, client_id, counselor_id`,
        [reference]
      );

      if (result.rows.length > 0) {
        return {
          success: true,
          type: "appointment",
          appointmentId: result.rows[0].id,
          appointmentCode: result.rows[0].appointment_code,
          clientId: result.rows[0].client_id,
          counselorId: result.rows[0].counselor_id,
        };
      }
    } else if (referenceType === "order") {
      // Update book order payment status
      const result = await pool.query(
        `UPDATE book_orders 
         SET payment_status = 'paid', 
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id::text = $1 OR client_email = $1
         RETURNING id, book_id, client_email, format`,
        [reference]
      );

      if (result.rows.length > 0) {
        const order = result.rows[0];
        
        // If soft copy, unlock it
        if (order.format === "soft") {
          const unlockCode = Math.random().toString(36).slice(2, 10).toUpperCase();
          await pool.query(
            `UPDATE book_orders SET unlock_code = $1 WHERE id = $2`,
            [unlockCode, order.id]
          );

          // Insert into library_entries
          await pool.query(
            `INSERT INTO library_entries (user_email, book_id, order_id, access_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_email, book_id) DO NOTHING`,
            [order.client_email, order.book_id, order.id, null]
          );
        }

        return {
          success: true,
          type: "order",
          orderId: order.id,
        };
      }
    }

    return { success: false, error: "Reference not found" };
  } catch (error) {
    console.error("Error marking payment as paid:", error);
    throw error;
  }
}

/**
 * Store payment transaction record
 * @param {Object} transactionData - Transaction details
 */
export async function storePaymentTransaction(transactionData) {
  try {
    await pool.query(
      `INSERT INTO payment_transactions (
        reference, reference_type, payment_method, amount_cents,
        transaction_id, status, gateway_response, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (transaction_id) DO UPDATE SET
        status = EXCLUDED.status,
        gateway_response = EXCLUDED.gateway_response,
        updated_at = NOW()`,
      [
        transactionData.reference,
        transactionData.referenceType,
        transactionData.paymentMethod,
        transactionData.amountCents,
        transactionData.transactionId,
        transactionData.status,
        JSON.stringify(transactionData.gatewayResponse || {}),
      ]
    );
  } catch (error) {
    // If table doesn't exist, log but don't fail
    if (error.message.includes("does not exist")) {
      console.warn("payment_transactions table not found. Create it to track payment history.");
    } else {
      console.error("Error storing payment transaction:", error);
    }
  }
}

