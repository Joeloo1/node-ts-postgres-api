import express from "express";

import {
  getAllProducts,
  getProduct,
  getProductsFeed,
} from "../../controller/productController";
import { validateParams } from "../../middleware/validationMiddleware";
import { productIdSchema } from "../../Schema/productSchema";

const router = express.Router();

router.route("/").get(getAllProducts);
router.route("/feed").get(getProductsFeed);
router.route("/:id").get(validateParams(productIdSchema), getProduct);

export default router;
