import express from "express";
import pool from "../db/pool.js";
import {
  initiateMpesaSTKPush,
  verifyMpesaPayment,
  markPaymentAsPaid,
  storePaymentTransaction,
  getAccountDetails,
  processCardPayment,
} from "../services/paymentService.js";
import bot from "../bot.js";

const router = express.Router();

/**
 * M-Pesa callback webhook
 * Handles payment confirmation from M-Pesa
 */
router.post("/mpesa/callback", async (req, res) => {
  try {
    const callbackData = req.body;

    // M-Pesa sends callback in Body.stkCallback
    const stkCallback = callbackData.Body?.stkCallback;
    
    if (!stkCallback) {
      console.log("Invalid M-Pesa callback format:", callbackData);
      return res.status(400).json({ error: "Invalid callback format" });
    }

    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const callbackMetadata = stkCallback.CallbackMetadata;

    // Check if payment was successful
    if (resultCode === 0 && callbackMetadata) {
      const items = callbackMetadata.Item || [];
      const amount = items.find((item) => item.Name === "Amount")?.Value;
      const mpesaReceiptNumber = items.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
      const transactionDate = items.find((item) => item.Name === "TransactionDate")?.Value;
      const phoneNumber = items.find((item) => item.Name === "PhoneNumber")?.Value;

      // Extract account reference (appointment code or order ID)
      const accountReference = items.find((item) => item.Name === "AccountReference")?.Value || checkoutRequestID;

      console.log(`[M-Pesa Payment] Payment successful:`, {
        checkoutRequestID,
        mpesaReceiptNumber,
        amount,
        accountReference,
        phoneNumber,
      });

      // Determine reference type (appointment code format vs order ID)
      const referenceType = accountReference.startsWith("APT-") || accountReference.startsWith("EMG-") ? "appointment" : "order";

      // Mark payment as paid
      const paymentResult = await markPaymentAsPaid(accountReference, "M-Pesa", mpesaReceiptNumber, referenceType);

      if (paymentResult.success) {
        // Store transaction
        await storePaymentTransaction({
          reference: accountReference,
          referenceType,
          paymentMethod: "M-Pesa",
          amountCents: amount ? amount * 100 : null,
          transactionId: mpesaReceiptNumber,
          status: "completed",
          gatewayResponse: callbackData,
        });

        // Send notification if it's an appointment
        if (paymentResult.type === "appointment" && paymentResult.clientId) {
          try {
            const clientRes = await pool.query(
              `SELECT telegram_user_id, contact_info FROM clients WHERE id = $1`,
              [paymentResult.clientId]
            );
            
            if (clientRes.rows[0]?.telegram_user_id && bot && bot.telegram) {
              await bot.telegram.sendMessage(
                clientRes.rows[0].telegram_user_id,
                `✅ Payment confirmed!\n\n` +
                `Your payment of KES ${(amount / 100).toFixed(2)} has been received.\n` +
                `Appointment: ${accountReference}\n` +
                `M-Pesa Receipt: ${mpesaReceiptNumber}\n\n` +
                `Your appointment has been confirmed. You'll receive a reminder before your session.`
              );
            }
          } catch (notifyErr) {
            console.error("Error sending payment confirmation notification:", notifyErr);
          }
        }
      }

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    } else {
      console.log(`[M-Pesa Payment] Payment failed:`, {
        checkoutRequestID,
        resultCode,
        resultDesc,
      });

      // Store failed transaction
      await storePaymentTransaction({
        reference: checkoutRequestID,
        referenceType: "unknown",
        paymentMethod: "M-Pesa",
        amountCents: null,
        transactionId: checkoutRequestID,
        status: "failed",
        gatewayResponse: callbackData,
      });

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received",
      });
    }
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: "Error processing callback",
    });
  }
});

/**
 * Card payment callback
 * Handles payment confirmation from card payment gateway
 */
router.post("/card/callback", async (req, res) => {
  try {
    const callbackData = req.body;
    const orderTrackingId = callbackData.OrderTrackingId || callbackData.order_tracking_id;
    const orderStatus = callbackData.OrderStatus || callbackData.status;

    if (orderStatus === "COMPLETED" || orderStatus === "completed") {
      // Extract reference from order
      const reference = callbackData.OrderMerchantReference || callbackData.reference;
      const transactionId = callbackData.TransactionId || callbackData.transaction_id;
      const amount = callbackData.Amount || callbackData.amount;

      console.log(`[Card Payment] Payment successful:`, {
        orderTrackingId,
        reference,
        transactionId,
        amount,
      });

      // Determine reference type
      const referenceType = reference?.startsWith("APT-") || reference?.startsWith("EMG-") ? "appointment" : "order";

      if (reference) {
        const paymentResult = await markPaymentAsPaid(reference, "Card", transactionId, referenceType);

        if (paymentResult.success) {
          await storePaymentTransaction({
            reference,
            referenceType,
            paymentMethod: "Card",
            amountCents: amount ? Math.round(amount * 100) : null,
            transactionId,
            status: "completed",
            gatewayResponse: callbackData,
          });

          // Send notification if it's an appointment
          if (paymentResult.type === "appointment" && paymentResult.clientId) {
            try {
              const clientRes = await pool.query(
                `SELECT telegram_user_id, contact_info FROM clients WHERE id = $1`,
                [paymentResult.clientId]
              );
              
              if (clientRes.rows[0]?.telegram_user_id && bot && bot.telegram) {
                await bot.telegram.sendMessage(
                  clientRes.rows[0].telegram_user_id,
                  `✅ Payment confirmed!\n\n` +
                  `Your card payment of KES ${(amount || 0).toFixed(2)} has been processed.\n` +
                  `Appointment: ${reference}\n` +
                  `Transaction ID: ${transactionId}\n\n` +
                  `Your appointment has been confirmed. You'll receive a reminder before your session.`
                );
              }
            } catch (notifyErr) {
              console.error("Error sending payment confirmation notification:", notifyErr);
            }
          }

          // Redirect to success page
          return res.redirect(`${process.env.FRONTEND_URL}/payment/success?reference=${reference}`);
        }
      }
    }

    // Redirect to failure page
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
  } catch (error) {
    console.error("Error processing card payment callback:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=processing`);
  }
});

/**
 * Get account details for display
 */
router.get("/account-details", (req, res) => {
  try {
    const details = getAccountDetails();
    res.json(details);
  } catch (error) {
    console.error("Error getting account details:", error);
    res.status(500).json({ error: "Failed to get account details" });
  }
});

/**
 * Initiate card payment
 */
router.post("/card/initiate", async (req, res) => {
  try {
    const { cardDetails, amount, reference, email, phoneNumber } = req.body;

    if (!cardDetails || !amount || !reference || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await processCardPayment(
      cardDetails,
      amount,
      reference,
      email,
      phoneNumber
    );

    res.json(result);
  } catch (error) {
    console.error("Error initiating card payment:", error);
    res.status(500).json({ error: error.message || "Failed to initiate card payment" });
  }
});

/**
 * Verify payment status
 */
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    // Check appointments
    const appointmentRes = await pool.query(
      `SELECT payment_status, status, appointment_code FROM appointments WHERE appointment_code = $1`,
      [reference]
    );

    if (appointmentRes.rows.length > 0) {
      return res.json({
        reference,
        type: "appointment",
        paymentStatus: appointmentRes.rows[0].payment_status,
        status: appointmentRes.rows[0].status,
      });
    }

    // Check orders
    const orderRes = await pool.query(
      `SELECT payment_status, fulfillment_status FROM book_orders WHERE id::text = $1 OR client_email = $1`,
      [reference]
    );

    if (orderRes.rows.length > 0) {
      return res.json({
        reference,
        type: "order",
        paymentStatus: orderRes.rows[0].payment_status,
        fulfillmentStatus: orderRes.rows[0].fulfillment_status,
      });
    }

    return res.status(404).json({ error: "Reference not found" });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;

