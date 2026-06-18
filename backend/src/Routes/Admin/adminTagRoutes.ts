import express from "express";
import {
  createTag,
  updateTag,
  deleteTag,
  setProductTags,
  removeTagFromProduct,
} from "../../controller/tagController";
import { validateBody } from "../../middleware/validationMiddleware";
import {
  createTagSchema,
  updateTagSchema,
  addTagsToProductSchema,
} from "../../Schema/tagSchema";

const router = express.Router();

// Tag CRUD
router.route("/").post(validateBody(createTagSchema), createTag);
router.route("/:id").patch(validateBody(updateTagSchema), updateTag).delete(deleteTag);

export default router;

// Product-tag assignment routes — mounted separately under /admin/products
export const productTagRouter = express.Router();
productTagRouter.put("/:id/tags", validateBody(addTagsToProductSchema), setProductTags);
productTagRouter.delete("/:id/tags/:tagId", removeTagFromProduct);
