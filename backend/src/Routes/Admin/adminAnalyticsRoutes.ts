import express from "express";
import { getDashboardStats } from "../../controller/adminAnalyticsController";

const router = express.Router();

router.get("/dashboard", getDashboardStats);

export default router;
