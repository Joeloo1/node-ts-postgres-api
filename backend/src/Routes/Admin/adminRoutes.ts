import express from "express";

import { Protect, restrictTo } from "../../controller/authController";

import adminProductRoute from "./adminProductRoutes";
import adminUserRoute from "./adminUserRoutes";
import adminCategoryRoute from "./adminCategoryRoutes";
import adminOrderRoute from "./adminOrderRoutes";
import adminAnalyticsRoute from "./adminAnalyticsRoutes";
import adminVariantRoute from "./adminVariantRoutes";
import adminTagRoute, { productTagRouter } from "./adminTagRoutes";
import adminAttributeRoute from "./adminAttributeRoutes";
import adminPromotionRoute from "./adminPromotionRoutes";
import adminBannerRoute from "./adminBannerRoutes";
import adminNotificationRoute from "./adminNotificationRoutes";
import adminShippingRoute from "./adminShippingRoutes";
import adminGiftCardRoute from "./adminGiftCardRoutes";
import { Role } from "../../types/role.types";
import { getSubscribers } from "../../controller/newsletterController";
import {
  getContractMessages,
  markRead,
} from "../../controller/contactController";
import {
  adminCreateCoupon,
  adminDeleteCoupon,
  adminGetCoupon,
  adminUpdateCoupon,
} from "../../controller/couponController";
import {
  adminGetReturn,
  adminUpdateReturn,
} from "../../controller/returnController";
import { validateBody } from "../../middleware/validationMiddleware";
import {
  createCouponSchema,
  updateCouponSchema,
} from "../../Schema/couponSchema";
import { updateReturnSchema } from "../../Schema/returnSchema";

const router = express.Router();

router.use(Protect, restrictTo(Role.ADMIN));

router.use("/categories", adminCategoryRoute);
router.use("/products", adminProductRoute);
router.use("/products", adminAttributeRoute);
router.use("/products", productTagRouter);
router.use("/users", adminUserRoute);
router.use("/orders", adminOrderRoute);
router.use("/analytics", adminAnalyticsRoute);
router.use("/variants", adminVariantRoute);
router.use("/tags", adminTagRoute);
router.use("/promotions", adminPromotionRoute);
router.use("/banners", adminBannerRoute);
router.use("/notifications", adminNotificationRoute);
router.use("/shipping", adminShippingRoute);
router.use("/gift-cards", adminGiftCardRoute);

router.get("/newsletter/subscribers", getSubscribers);
router.get("/contact", getContractMessages);
router.patch("/contact/:id/read", markRead);
router
  .route("/coupons")
  .get(adminGetCoupon)
  .post(validateBody(createCouponSchema), adminCreateCoupon);
router
  .route("/coupons/:id")
  .patch(validateBody(updateCouponSchema), adminUpdateCoupon)
  .delete(adminDeleteCoupon);
router.get("/returns", adminGetReturn);
router.patch(
  "/returns/:id",
  validateBody(updateReturnSchema),
  adminUpdateReturn,
);

export default router;
