import express from "express";
import {
  createVariant,
  updateVariant,
  deleteVariant,
} from "../../controller/variantsController";
import { validateBody, validateParams } from "../../middleware/validationMiddleware";
import {
  createVariantSchema,
  updateVariantSchema,
  variantIdSchema,
} from "../../Schema/variantSchema";
import { productIdSchema } from "../../Schema/productSchema";

// Auth/role guard is applied globally in adminRoutes.ts — no need to repeat it here.
const router = express.Router();

// POST  /api/v1/admin/variants/product/:id  — :id is the product UUID
router.post(
  "/product/:id",
  validateParams(productIdSchema),
  validateBody(createVariantSchema),
  createVariant,
);

// PATCH  /api/v1/admin/variants/:id  — :id is the variant UUID
router.patch(
  "/:id",
  validateParams(variantIdSchema),
  validateBody(updateVariantSchema),
  updateVariant,
);

// DELETE /api/v1/admin/variants/:id  — :id is the variant UUID
router.delete(
  "/:id",
  validateParams(variantIdSchema),
  deleteVariant,
);

export default router;
