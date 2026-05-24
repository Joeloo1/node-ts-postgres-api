import express from "express";

import {
  login,
  signup,
  logout,
  forgetPassword,
  resetPassword,
  verifyEmail,
  Protect,
  updatePassword,
} from "../../controller/authController";
import { validateBody } from "../../middleware/validationMiddleware";
import {
  signupSchema,
  loginSchema,
} from "../../Schema/userSchema";
import { updateMe, getMe, deleteMe } from "../../controller/userController";
import { uploadUserPhoto, resizeUserPhoto } from "../../middleware/uploadMiddleware";



const router = express.Router();

router.post("/Signup", validateBody(signupSchema), signup);

router.post("/Login", validateBody(loginSchema), login);
router.post("/Logout", logout);

router.post("/forgetPassword", forgetPassword);
router.patch("/resetPassword/:token", resetPassword);
router.get("/verifyEmail/:token", verifyEmail);

router.use(Protect);

router.patch(
  "/updateMyPassword",
  updatePassword
);
router.patch("/updateMe",
  uploadUserPhoto,
  resizeUserPhoto,
  updateMe);
router.get("/me", getMe);
router.delete("/deleteMe", deleteMe);

export default router;
