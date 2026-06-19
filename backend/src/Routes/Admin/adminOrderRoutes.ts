import express from "express";

import {
  updateOrder,
  adminCancelOrder,
  getAllOrders,
  bulkUpdateOrderStatus,
} from "../../controller/orderController";
import { validateBody } from "../../middleware/validationMiddleware";
import { updateOrderStatusSchema } from "../../Schema/orderSchema";

const router = express.Router();

router.route("/").get(getAllOrders);
router.patch("/bulk-status", bulkUpdateOrderStatus);
router
  .route("/:id/status")
  .patch(validateBody(updateOrderStatusSchema), updateOrder);
router.route("/:id/cancel").patch(adminCancelOrder);

export default router;
