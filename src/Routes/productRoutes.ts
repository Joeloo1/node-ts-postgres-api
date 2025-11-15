import express from "express";

import { products } from "../controller/productController";

const router = express.Router()

router.route('/').get(products)

export default router