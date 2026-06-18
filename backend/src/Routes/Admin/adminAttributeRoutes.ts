import express from "express";
import {
  createAttribute,
  bulkSetAttributes,
  deleteAttribute,
} from "../../controller/attributeController";
import { validateBody } from "../../middleware/validationMiddleware";
import {
  createAttributeSchema,
  bulkSetAttributesSchema,
} from "../../Schema/attributeSchema";

const router = express.Router();

// Per-product attribute management (productId in :id)
router.post("/:id/attributes", validateBody(createAttributeSchema), createAttribute);
router.put("/:id/attributes", validateBody(bulkSetAttributesSchema), bulkSetAttributes);

// Delete by attribute ID
router.delete("/attributes/:attributeId", deleteAttribute);

export default router;
