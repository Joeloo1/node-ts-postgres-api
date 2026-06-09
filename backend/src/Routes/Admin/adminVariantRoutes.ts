import express from "express";
import {
  createVariant,
  updateVariant,
  deleteVariant,
} from "../../controller/variantsController";
import { Protect, restrictTo } from "../../controller/authController";
import { Role } from "../../types/role.types";
import {
  validateBody,
  validateParams,
} from "../../middleware/validationMiddleware";
import {
  createVariantSchema,
  updateVariantSchema,
  variantIdSchema,
} from "../../Schema/variantSchema";

const router = express.Router({ mergeParams: true });

// POST /api/v1/products/:id/variants — admin only
router.post(
  "/",
  Protect,
  restrictTo(Role.ADMIN),
  validateBody(createVariantSchema),
  createVariant,
);

// PATCH/DELETE /api/v1/variants/:id — admin only
router.patch(
  "/:id",
  Protect,
  restrictTo(Role.ADMIN),
  validateParams(variantIdSchema),
  validateBody(updateVariantSchema),
  updateVariant,
);

router.delete(
  "/:id",
  Protect,
  restrictTo(Role.ADMIN),
  validateParams(variantIdSchema),
  deleteVariant,
);

export default router;
