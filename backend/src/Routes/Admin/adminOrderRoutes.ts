import express from "express";

import {
  updateOrder,
  adminCancelOrder,
  getAllOrders,
} from "../../controller/orderController";
import { validateBody } from "../../middleware/validationMiddleware";
import { updateOrderStatusSchema } from "../../Schema/orderSchema";

const router = express.Router();

router.route("/").get(getAllOrders);
router
  .route("/:id/status")
  .patch(validateBody(updateOrderStatusSchema), updateOrder);
router.route("/:id/cancel").patch(adminCancelOrder);

export default router;
