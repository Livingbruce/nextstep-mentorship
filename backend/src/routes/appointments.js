import express from "express";
import {
  createAppointment,
  getAppointmentsByCounselor,
  updateAppointmentStatus,
  cancelAppointment
} from "../controllers/appointmentsControllers.js";

const router = express.Router();

router.post("/", createAppointment); 
router.get("/counselor/:id", getAppointmentsByCounselor); 
router.patch("/:id/status", updateAppointmentStatus); 
router.delete("/:id", cancelAppointment); 

export default router;