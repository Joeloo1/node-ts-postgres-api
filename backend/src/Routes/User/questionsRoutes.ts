import express from "express";
import {
  getProductQuestions,
  createQuestion,
  answerQuestion,
  deleteQuestion,
  deleteAnswer,
} from "../../controller/questionsController";
import { Protect } from "../../controller/authController";
import {
  validateBody,
  validateParams,
} from "../../middleware/validationMiddleware";
import {
  createQuestionSchema,
  createAnswerSchema,
  questionIdSchema,
  answerIdSchema,
} from "../../Schema/questionSchema";

const router = express.Router({ mergeParams: true });

// GET /api/v1/products/:id/questions — public
router.get("/", getProductQuestions);

router.use(Protect);

// POST /api/v1/products/:id/questions — auth required
router.post("/", validateBody(createQuestionSchema), createQuestion);

// POST /api/v1/questions/:id/answers
router.post(
  "/:id/answers",
  validateParams(questionIdSchema),
  validateBody(createAnswerSchema),
  answerQuestion,
);

// DELETE /api/v1/questions/:id
router.delete("/:id", validateParams(questionIdSchema), deleteQuestion);

// DELETE /api/v1/products/:productId/questions/:id/answers/:answerId
router.delete(
  "/:id/answers/:answerId",
  validateParams(answerIdSchema),
  deleteAnswer,
);

export default router;
