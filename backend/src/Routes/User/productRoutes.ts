import express from "express";

import {
  getAllProducts,
  getProduct,
  getProductsFeed,
} from "../../controller/productController";
import { getProductPriceHistory } from "../../controller/priceHistoryController";
import { validateParams } from "../../middleware/validationMiddleware";
import { productIdSchema } from "../../Schema/productSchema";
import variantsRoutes from "./variantsRoutes";
import questionsRoutes from "./questionsRoutes";

const router = express.Router();

router.route("/").get(getAllProducts);
router.route("/feed").get(getProductsFeed);
router.route("/:id").get(validateParams(productIdSchema), getProduct);
router
  .route("/:id/price-history")
  .get(validateParams(productIdSchema), getProductPriceHistory);

// Nested routes
router.use("/:id/variants", variantsRoutes);
router.use("/:id/questions", questionsRoutes);

export default router;
