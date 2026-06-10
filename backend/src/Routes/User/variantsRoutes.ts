import express from "express";
import { getProductVariants } from "../../controller/variantsController";

const router = express.Router({ mergeParams: true });

// GET /api/v1/products/:id/variants — public
router.get("/", getProductVariants);

export default router;
