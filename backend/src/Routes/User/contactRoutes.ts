import { Router } from "express";
import { submitContact } from "../../controller/contactController";
import { validateBody } from "../../middleware/validationMiddleware";
import { contactSchema } from "../../Schema/contactSchema";

const router = Router();

router.post("/", validateBody(contactSchema), submitContact);

export default router;
