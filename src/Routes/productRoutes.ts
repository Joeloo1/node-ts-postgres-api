import express from "express";

import { createProduct, getAllProducts } from "../controller/productController";

const router = express.Router()

router.route('/').get(getAllProducts)
router.route('/').post(createProduct)

export default router