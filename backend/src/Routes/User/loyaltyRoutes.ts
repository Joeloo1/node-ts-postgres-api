import express from "express";
import { Protect } from "../../controller/authController";
import { getMyLoyalty } from "../../controller/loyaltyController";

const router = express.Router();

router.use(Protect);
router.get("/", getMyLoyalty);

export default router;
