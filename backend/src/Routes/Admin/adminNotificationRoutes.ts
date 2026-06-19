import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from "../../controller/adminNotificationController";

const router = express.Router();

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;
