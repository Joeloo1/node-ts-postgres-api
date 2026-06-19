import express from "express";
import multer from "multer";

import {
  createProduct,
  addProductImages,
  deleteProduct,
  updateProduct,
  bulkUpdateProducts,
  bulkDeleteProducts,
  bulkUpdateStock,
  exportProducts,
  importProducts,
} from "../../controller/productController";
import {
  validateBody,
  validateParams,
} from "../../middleware/validationMiddleware";
import {
  createProductSchema,
  productIdSchema,
  updateProductSchema,
} from "../../Schema/productSchema";
import { uploadProductImages, resizeProductImages } from "../../middleware/uploadMiddleware";

const router = express.Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Bulk & utility (must be before /:id)
router.get("/export", exportProducts);
router.post("/import", csvUpload.single("file"), importProducts);
router.patch("/bulk", bulkUpdateProducts);
router.patch("/bulk-stock", bulkUpdateStock);
router.delete("/bulk", bulkDeleteProducts);

router.route("/").post(validateBody(createProductSchema), createProduct);

router.post(
  "/:id/images",
  validateParams(productIdSchema),
  uploadProductImages,
  resizeProductImages,
  addProductImages,
);

router
  .route("/:id")
  .patch(
    validateParams(productIdSchema),
    validateBody(updateProductSchema),
    updateProduct,
  )
  .delete(validateParams(productIdSchema), deleteProduct);

export default router;
