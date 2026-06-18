import express from "express";

import {
  getAllProducts,
  getProduct,
  getProductsFeed,
  getSuggestions,
  searchProducts,
  getTrending,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
} from "../../controller/productController";
import { getAllTags } from "../../controller/tagController";
import { getProductAttributes } from "../../controller/attributeController";
import { getProductPriceHistory } from "../../controller/priceHistoryController";
import { validateParams } from "../../middleware/validationMiddleware";
import { productIdSchema } from "../../Schema/productSchema";
import variantsRoutes from "./variantsRoutes";
import questionsRoutes from "./questionsRoutes";

const router = express.Router();

// Discovery & search — must come before /:id
router.get("/search", searchProducts);
router.get("/suggestions", getSuggestions);
router.get("/trending", getTrending);
router.get("/feed", getProductsFeed);

// Tag collection browsing (public)
router.get("/tags", getAllTags);

// Catalogue listing
router.get("/", getAllProducts);

// Single product
router.get("/:id", validateParams(productIdSchema), getProduct);
router.get("/:id/price-history", validateParams(productIdSchema), getProductPriceHistory);
router.get("/:id/related", validateParams(productIdSchema), getRelatedProducts);
router.get("/:id/frequently-bought-together", validateParams(productIdSchema), getFrequentlyBoughtTogether);
router.get("/:id/attributes", validateParams(productIdSchema), getProductAttributes);

// Nested routes
router.use("/:id/variants", variantsRoutes);
router.use("/:id/questions", questionsRoutes);

export default router;
