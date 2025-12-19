import path from "path";
import multer, { FileFilterCallback } from "multer";
import sharp from "sharp";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import catchAsync from "../utils/catchAsync";

// Multer memory storage 
const multeStorage = multer.memoryStorage();

const multerFilter = (req: Request, file: Express.Multer.File, cd: FileFilterCallback) => {
  if (file.mimetype.startsWith('image')) {
    cd(null, true)
  } else {
    cd(new AppError('Not an image! Please upload only images', 400))
  }
}

const upload = multer({
  storage: multeStorage,
  fileFilter: multerFilter
});

// middleware to upload single file 
export const uploadUserPhoto = upload.single('profileImage');

// resize image 
export const resizeUserPhoto = catchAsync(async(req: Request, res: Response, next: NextFunction ) => {
  if (!req.file) return next();

  if (!req.user || !req.user.id) {
    return next(new AppError('User not authenticated', 401))
  };

  // Generate unique filename 
  const filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  const uploadDir = path.join(__dirname, '../../public/users')
  const filepath =  path.join(uploadDir, filename);

  // Resize and save image 
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(filepath)

  req.file.filename = filename

  next();
})

