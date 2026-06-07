import multer, { FileFilterCallback } from "multer";
import sharp from "sharp";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import catchAsync from "../utils/catchAsync";
import logger from "../config/logger";
import { uploadToS3 } from "../config/s3";

const multerFilter = (
  _req: Request,
  file: Express.Multer.File,
  cd: FileFilterCallback,
) => {
  logger.info(
    `File upload attempt: ${file.originalname} with mimetype: ${file.mimetype}`,
  );
  if (file.mimetype.startsWith("image")) {
    cd(null, true);
  } else {
    logger.warn("Upload failed: Not an image file");
    cd(new AppError("Not an image! Please upload only images", 400));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadUserPhoto = upload.single("profileImage");
export const uploadProductImages = upload.array("images", 10);

export const resizeUserPhoto = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file) return next();

    if (!req.user?.id) {
      return next(new AppError("User not authenticated", 401));
    }

    logger.info("Processing and uploading user photo");
    const key = `users/user-${req.user.id}-${Date.now()}.jpeg`;
    const buffer = await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    req.file.filename = await uploadToS3(buffer, key);
    next();
  },
);

export const resizeProductImages = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) return next();

    const productId = req.params.id;
    if (!productId) return next(new AppError("Product id is required", 400));

    logger.info(`Processing and uploading ${files.length} product image(s)`);
    const urls = await Promise.all(
      files.map(async (file, idx) => {
        const key = `products/product-${productId}-${Date.now()}-${idx + 1}.jpeg`;
        const buffer = await sharp(file.buffer)
          .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
          .toFormat("jpeg")
          .jpeg({ quality: 88 })
          .toBuffer();
        return uploadToS3(buffer, key);
      }),
    );

    (req as any).uploadedProductImages = urls;
    next();
  },
);
