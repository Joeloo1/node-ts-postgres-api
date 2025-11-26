import express from "express";

import { createProduct,
         deleteProduct,
         getAllProducts, 
         getProduct, 
         updateProduct } from "../controller/productController";
import { validateBody, validateParams } from "../middleware/validationMiddleware";
import { createProductSchema , productIdSchema, updateProductSchema} from "../Schema/productSchema";

const router = express.Router()

router.route('/').get(getAllProducts);
router.route('/').post(validateBody(createProductSchema), createProduct);
router.route('/:id').get(validateParams(productIdSchema), getProduct);
router.route('/:id').patch(
    validateParams(productIdSchema), 
    validateBody(updateProductSchema) , 
     updateProduct);
router.route('/:id').delete(validateParams(productIdSchema), deleteProduct)

export default router