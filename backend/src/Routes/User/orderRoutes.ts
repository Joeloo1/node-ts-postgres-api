import express from "express";
import { Protect, restrictTo } from "../../controller/authController";
import {
  createOrder,
  checkoutFromCart,
  getMyOrder,
  getOrderById,
  updateOrder,
  cancelOrder,
  trackOrder,
} from "../../controller/orderController";
import { createReturnSchema } from "../../Schema/returnSchema";
import { createReturn, getMyRetrun } from "../../controller/returnController";
import { Role } from "../../types/role.types";
import { validateBody } from "../../middleware/validationMiddleware";

const router = express.Router();

// Public — no auth required
router.get("/track", trackOrder);

// All routes below require authentication
router.use(Protect);

router.route("/").get(getMyOrder).post(createOrder);
router.post("/checkout", checkoutFromCart);

// /returns must come BEFORE /:id so it isn't captured as an order ID
router.get("/returns", getMyRetrun);

router.route("/:id").get(getOrderById).patch(cancelOrder);
router.patch("/:id/admin", restrictTo(Role.ADMIN), updateOrder);

router.post("/:orderId/return", validateBody(createReturnSchema), createReturn);

export default router;
