import express from "express";

import {
  login,
  signup,
  forgetPassword,
  resetPassword,
  Protect,
  updatePassword,
} from "../../controller/authController";
import { validateBody } from "../../middleware/validationMiddleware";
import {
  signupSchema,
  loginSchema,
  updateUserSchema,
} from "../../Schema/userSchema";
import { updateMe, getMe, deleteMe } from "../../controller/userController";
import { uploadUserPhoto, resizeUserPhoto } from "../../middleware/uploadMiddleware";



const router = express.Router();

router.post("/Signup", validateBody(signupSchema), signup);

router.post("/Login", validateBody(loginSchema), login);

router.post("/forgetPassword", forgetPassword);
router.patch("/resetPassword/:token", resetPassword);

router.use(Protect);

router.patch(
  "/updateMyPassword",
  validateBody(updateUserSchema),
  updatePassword
);
router.patch("/updateMe",
  uploadUserPhoto,
  resizeUserPhoto,
  updateMe);
router.get("/me", getMe);
router.delete("/deleteMe", deleteMe);

export default router;
