import multer, { FileFilterCallback } from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import catchAsync from "../utils/catchAsync";
import logger from "../config/logger";
import { uploadToS3, isS3Configured } from "../config/s3";

const PUBLIC_DIR = path.join(__dirname, "../../public");

async function saveLocally(
  buffer: Buffer,
  subfolder: string,
  filename: string,
): Promise<string> {
  const dir = path.join(PUBLIC_DIR, subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  // Return just the filename — the frontend resolves the full URL via VITE_API_URL
  return filename;
}

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

    logger.info("Processing user photo");
    const buffer = await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    const filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    if (isS3Configured()) {
      logger.info("Uploading user photo to S3");
      req.file.filename = await uploadToS3(buffer, `users/${filename}`);
    } else {
      logger.info("S3 not configured — saving user photo to local disk");
      req.file.filename = await saveLocally(buffer, "users", filename);
    }

    next();
  },
);

export const resizeProductImages = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) return next();

    const productId = req.params.id;
    if (!productId) return next(new AppError("Product id is required", 400));

    logger.info(`Processing ${files.length} product image(s)`);

    const urls = await Promise.all(
      files.map(async (file, idx) => {
        const filename = `product-${productId}-${Date.now()}-${idx + 1}.jpeg`;
        const buffer = await sharp(file.buffer)
          .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
          .toFormat("jpeg")
          .jpeg({ quality: 88 })
          .toBuffer();

        if (isS3Configured()) {
          logger.info(`Uploading product image ${idx + 1} to S3`);
          return uploadToS3(buffer, `products/${filename}`);
        } else {
          logger.info(`S3 not configured — saving product image ${idx + 1} to local disk`);
          return saveLocally(buffer, "products", filename);
        }
      }),
    );

    (req as any).uploadedProductImages = urls;
    next();
  },
);
