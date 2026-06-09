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

router.use(Protect);

router
  .route("/")
  .get(getProductReview)
  .post(validateBody(createReviewSchema), createReview);

router
  .route("/:id")
  .patch(
    validateParams(reviewIdShema),
    validateBody(updateReviewSchema),
    updateReview,
  )
  .delete(validateParams(reviewIdShema), deleteReview);

router
  .route("/:id/vote")
  .post(validateParams(reviewIdShema), voteReview)
  .delete(validateParams(reviewIdShema), unvoteReview);

export default router;
