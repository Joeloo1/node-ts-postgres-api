import express from "express";
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getAuditLogs,
} from "../../controller/adminController";

const router = express.Router();

router.route("/audit-log").get(getAuditLogs);

router.route("/").get(getAllUsers).post(createUser);
router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser);

export default router;
