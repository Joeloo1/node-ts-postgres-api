import express from "express";

import { Protect, restrictTo } from "../../controller/authController";

import adminProductRoute from "./adminProductRoutes";
import adminUserRoute from "./adminUserRoutes";
import adminCategoryRoute from "./adminCategoryRoutes";
import adminOrderRoute from "./adminOrderRoutes";
import adminAnalyticsRoute from "./adminAnalyticsRoutes";
import adminVariantRoute from "./adminVariantRoutes";
import { Role } from "../../types/role.types";
import { getSubscribers } from "../../controller/newsletterController";
import {
  getContractMessages,
  markRead,
} from "../../controller/contactController";

const router = express.Router();

router.use(Protect, restrictTo(Role.ADMIN));

router.use("/categories", adminCategoryRoute);
router.use("/products", adminProductRoute);
router.use("/users", adminUserRoute);
router.use("/orders", adminOrderRoute);
router.use("/analytics", adminAnalyticsRoute);
router.use("/variants", adminVariantRoute);
router.get("/newsletter/subscribers", getSubscribers);
router.get("/contact", getContractMessages);
router.patch("/contact/:id/read", markRead);

export default router;
