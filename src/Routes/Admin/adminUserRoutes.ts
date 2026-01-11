import express from "express";
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from "../../controller/userController";

const router = express.Router();

// user
router.route("/").get(getAllUsers).post(createUser);

router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser);

export default router;
