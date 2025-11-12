import { createWebBooking } from "../services/bookingService.js";

export async function submitWebBooking(req, res) {
  try {
    console.log("[Web Booking] Starting booking submission");
    const result = await createWebBooking(req.body || {});
    console.log("[Web Booking] Booking created successfully:", {
      appointmentId: result.appointmentId,
      appointmentCode: result.appointmentCode,
    });
    
    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Web Booking] Submission failed:", error);
    console.error("[Web Booking] Error stack:", error.stack);
    console.error("[Web Booking] Error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    });

    const status = error.status || 500;
    const response = {
      success: false,
      error: error.code || "INTERNAL_ERROR",
      message: error.message || "Unable to process booking at the moment.",
    };

    if (error.details) {
      response.details = error.details;
    }

    return res.status(status).json(response);
  }
}

