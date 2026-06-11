import { Router } from "express";
import { validateBody } from "../../middleware/validationMiddleware";
import { validateCoupon } from "../../controller/couponController";
import { validateCouponSchema } from "../../Schema/couponSchema";
import { Protect } from "../../controller/authController";

const router = Router();

router.use(Protect);

router.post("/validate", validateBody(validateCouponSchema), validateCoupon);

export default router;
