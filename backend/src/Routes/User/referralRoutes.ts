import express from "express";
import { Protect } from "../../controller/authController";
import { getMyReferral } from "../../controller/referralController";

const router = express.Router();

router.use(Protect);
router.get("/", getMyReferral);

export default router;
