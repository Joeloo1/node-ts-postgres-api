import express from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validationMiddleware";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdSchema,
} from "../../Schema/addressSchema";
import {
  createAddress,
  updateAddress,
  getAllAddresses,
  getAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../controller/addressController";
import { Protect } from "../../controller/authController";

const router = express.Router();

router.use(Protect);

router
  .route("/")
  .get(getAllAddresses)
  .post(validateBody(createAddressSchema), createAddress);

router
  .route("/:id")
  .get(validateParams(addressIdSchema), getAddress)
  .patch(
    validateParams(addressIdSchema),
    validateBody(updateAddressSchema),
    updateAddress
  )
  .delete(validateParams(addressIdSchema), deleteAddress);

router.patch("/:id/default", validateParams(addressIdSchema), setDefaultAddress);

export default router;
