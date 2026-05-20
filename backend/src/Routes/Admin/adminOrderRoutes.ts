import express from "express";

import { updateOrder, adminCancelOrder, getAllOrders } from "../../controller/orderController";

const router = express.Router();

router.route("/").get(getAllOrders);
router.route("/:id/status").patch(updateOrder);
router.route("/:id/cancel").patch(adminCancelOrder);

export default router;
