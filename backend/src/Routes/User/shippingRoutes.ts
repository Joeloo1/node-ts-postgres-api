import express from "express";
import { getShippingRates, carrierTrackingWebhook } from "../../controller/shippingController";

const router = express.Router();

router.post("/rates", getShippingRates);
// EasyPost sends tracking events here — must be public, no auth
router.post("/tracking-webhook", carrierTrackingWebhook);

export default router;
