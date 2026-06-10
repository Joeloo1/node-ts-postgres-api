import { Router } from "express";
import { subscribe, unsubscribe } from "../../controller/newsletterController";
import { validateBody } from "../../middleware/validationMiddleware";
import { subscribeSchema } from "../../Schema/newsletterSchema";

const router = Router();

router.post("/subscribe", validateBody(subscribeSchema), subscribe);
router.post("/unsubscribe", validateBody(subscribeSchema), unsubscribe);

export default router;
