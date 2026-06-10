import express from "express";

import {
  createReview,
  updateReview,
  getProductReview,
  deleteReview,
  voteReview,
  unvoteReview,
} from "../../controller/reviewsController";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdShema,
} from "../../Schema/reviewsSchema";
import {
  validateBody,
  validateParams,
} from "../../middleware/validationMiddleware";
import { Protect } from "../../controller/authController";

const router = express.Router();

router.get("/", getProductReview);

router.use(Protect);

router.post("/", validateBody(createReviewSchema), createReview);

router.patch(
  "/:id",
  validateParams(reviewIdShema),
  validateBody(updateReviewSchema),
  updateReview,
);

router.delete("/:id", validateParams(reviewIdShema), deleteReview);

router.post("/:id/vote", validateParams(reviewIdShema), voteReview);

router.delete("/:id/vote", validateParams(reviewIdShema), unvoteReview);

export default router;
