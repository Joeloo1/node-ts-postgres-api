import express from "express";
import {
  getDashboardStats,
  getRevenueBreakdown,
  getTopCustomers,
  getTopProductsAnalytics,
} from "../../controller/adminAnalyticsController";
import { getEventFunnel } from "../../controller/analyticsEventController";

const router = express.Router();

router.get("/dashboard", getDashboardStats);
router.get("/revenue", getRevenueBreakdown);
router.get("/top-customers", getTopCustomers);
router.get("/top-products", getTopProductsAnalytics);
router.get("/funnel", getEventFunnel);

export default router;
