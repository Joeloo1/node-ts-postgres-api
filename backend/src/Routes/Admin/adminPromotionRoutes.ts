import express from "express";
import {
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotion,
} from "../../controller/promotionController";
import { validateBody } from "../../middleware/validationMiddleware";
import {
  createPromotionSchema,
  updatePromotionSchema,
} from "../../Schema/promotionSchema";

const router = express.Router();

router.route("/").get(getAllPromotions).post(validateBody(createPromotionSchema), createPromotion);
router
  .route("/:id")
  .patch(validateBody(updatePromotionSchema), updatePromotion)
  .delete(deletePromotion);
router.patch("/:id/toggle", togglePromotion);

export default router;
