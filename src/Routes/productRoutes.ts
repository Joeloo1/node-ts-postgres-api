import express from "express";

import { createProduct, getAllProducts, getProduct } from "../controller/productController";

const router = express.Router()

router.route('/').get(getAllProducts)
router.route('/').post(createProduct)
router.route('/:id').get(getProduct)

export default router