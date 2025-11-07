import express from "express";
import {
  createSlot,
  listSlotsByCounselor,
  deleteSlot,
  bookSlot
} from "../controllers/slotsController.js";

const router = express.Router();

router.post("/", createSlot);
router.get("/counselor/:id", listSlotsByCounselor);
router.delete("/:id", deleteSlot);
router.post("/:id/book", bookSlot);

export default router;