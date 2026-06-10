import express from "express";
import { createCheckoutSession, verifyCheckoutSession } from "../../controller/paymentController";
import { Protect } from "../../controller/authController";

const router = express.Router();

router.use(Protect);

router.post("/create-checkout-session", createCheckoutSession);
router.get("/verify-session/:sessionId", verifyCheckoutSession);

export default router;
