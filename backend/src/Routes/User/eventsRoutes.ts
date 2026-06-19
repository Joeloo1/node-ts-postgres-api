import express from "express";
import { optionalProtect } from "../../controller/authController";
import { trackEvent } from "../../controller/analyticsEventController";

const router = express.Router();

// Intentionally unauthenticated — attaches user if JWT is present but doesn't block
router.post("/", optionalProtect, trackEvent);

export default router;
