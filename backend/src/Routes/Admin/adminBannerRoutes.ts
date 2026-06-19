import express from "express";
import {
  adminGetBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../../controller/bannerController";
import { validateBody } from "../../middleware/validationMiddleware";
import { createBannerSchema, updateBannerSchema } from "../../Schema/bannerSchema";

const router = express.Router();

router.route("/").get(adminGetBanners).post(validateBody(createBannerSchema), createBanner);
router
  .route("/:id")
  .patch(validateBody(updateBannerSchema), updateBanner)
  .delete(deleteBanner);

export default router;
