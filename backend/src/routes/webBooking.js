import express from "express";
import { submitWebBooking } from "../controllers/webBookingController.js";

const router = express.Router();

router.post("/", submitWebBooking);

export default router;

