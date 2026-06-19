import express from "express";
import {
  getAllZones,
  createZone,
  updateZone,
  deleteZone,
  shipOrder,
} from "../../controller/shippingController";
import { validateBody } from "../../middleware/validationMiddleware";
import { createZoneSchema, updateZoneSchema } from "../../Schema/shippingSchema";

const router = express.Router();

// Shipping zone CRUD
router
  .route("/zones")
  .get(getAllZones)
  .post(validateBody(createZoneSchema), createZone);
router
  .route("/zones/:id")
  .patch(validateBody(updateZoneSchema), updateZone)
  .delete(deleteZone);

// Ship an order (purchase label or set manual tracking)
router.post("/orders/:id/ship", shipOrder);

export default router;
