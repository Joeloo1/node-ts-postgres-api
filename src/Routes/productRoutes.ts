import express from "express";

import { createProduct, getAllProducts, getProduct } from "../controller/productController";
import { validate } from "../middleware/validationMiddleware";
import { createProductSchema } from "../Schema/productSchema";

const router = express.Router()

router.route('/').get(getAllProducts)
router.route('/').post(validate(createProductSchema), createProduct)
router.route('/:id').get(getProduct)

export default router