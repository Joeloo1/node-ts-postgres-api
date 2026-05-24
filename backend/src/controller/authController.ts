import { Request, Response, NextFunction } from "express";
import JWT from "jsonwebtoken";
import crypto from "crypto";

import catchAsync from "../utils/catchAsync";
import { loginSchema, signupSchema } from "../Schema/userSchema";
import {
  hashPassword,
  comparePassword,
  changePasswordAfter,
  createPasswordResetToken,
} from "../utils/password";
import AppError from "../utils/AppError";
import { signToken } from "../utils/jwt";
import { prisma } from "../config/database";
import sendMail from "../utils/email";
import logger from "../config/logger";
import { Role } from "../types/role.types";
import { JwtPayload } from "../types/auth.types";
import { UserRole } from "@prisma/client";
import { client as redis, scanDel } from "../config/redis";
import type { CookieOptions } from "express";

const clearUsersListCache = async () => {
  await scanDel("users:list:*");
};

const AUTH_USER_TTL = 300; // 5 minutes
const getAuthUserKey = (id: string) => `auth:user:${id}`;

const buildAuthCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";
  const maxAgeMs =
    Number(process.env.JWT_COOKIE_EXPIRES_DAYS ?? "7") * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: maxAgeMs,
    path: "/",
  };
};

const setAuthCookie = (res: Response, token: string) => {
  res.cookie("jwt", token, buildAuthCookieOptions());
};

const clearAuthCookie = (res: Response) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
};

const getTokenFromCookieHeader = (
  cookieHeader?: string,
): string | undefined => {
  if (!cookieHeader) return undefined;
  const pairs = cookieHeader.split(";").map((part) => part.trim());
  for (const p of pairs) {
    if (p.startsWith("jwt=")) return decodeURIComponent(p.slice(4));
  }
  return undefined;
};

//  Signup User
export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = signupSchema.parse(req.body);

    const exitingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (exitingUser) {
      logger.warn("User already exists in database", { email: user.email });
      return next(new AppError("User with this email already exists", 400));
    }

    user.password = await hashPassword(user.password);

    logger.info("Creating a new user", { email: user.email });
    const newUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
        phoneNumber: user.phoneNumber,
        // Never trust role from client on signup.
        roles: UserRole.USER,
        profileImage: user.profileImage,
      },
    });

    // New signup affects admin user listings cached by userController.
    await clearUsersListCache();

    // Send email verification
    const rawVerifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = crypto.createHash("sha256").update(rawVerifyToken).digest("hex");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: newUser.id },
      data: { verifyToken: hashedVerifyToken, verifyTokenExpiry },
    });

    const verifyURL = `${req.protocol}://${req.get("host")}/api/v1/users/verifyEmail/${rawVerifyToken}`;
    try {
      await sendMail({
        email: newUser.email,
        subject: "Verify your email address (valid for 24 hours)",
        message: `Welcome to Northline! Please verify your email by visiting: ${verifyURL}`,
      });
    } catch {
      logger.warn("Failed to send verification email", { email: newUser.email });
    }

    const token = signToken({ id: newUser.id });
    setAuthCookie(res, token);

    const sanitizedUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roles: newUser.roles,
      phoneNumber: newUser.phoneNumber,
      profileImage: newUser.profileImage,
      createAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      isVerified: newUser.isVerified,
    };
    logger.info("User created successfully", { email: newUser.email });
    res.status(201).json({
      status: "success",
      token,
      data: {
        user: sanitizedUser,
      },
    });
  },
);

// login  user
export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.warn("Login attempt with incorrect email", { email });
      return next(new AppError("Incorrect email and password", 401));
    }

    const isPasswordCorrect = await comparePassword(password, user.password);

    if (!isPasswordCorrect) {
      logger.warn("Login attempt with incorrect password", { email });
      return next(new AppError("Incorrect email and password", 401));
    }

    const token = signToken({ id: user.id });
    setAuthCookie(res, token);

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isVerified: user.isVerified,
      active: user.active,
    };

    logger.info("User logged in successfully", { email: user.email });
    res.status(200).json({
      status: "success",
      token,
      data: {
        user: sanitizedUser,
      },
    });
  },
);

// Protect routes
export const Protect = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      token = getTokenFromCookieHeader(req.headers.cookie);
    }

    if (!token) {
      logger.warn("Unauthorized access attempt - no token provided");
      return next(
        new AppError("You are no longer logged in, Please log in again", 401),
      );
    }
    // verify token
    const decoded = JWT.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    // check if user still exists — serve from cache when possible
    let currentUser;
    const cacheKey = getAuthUserKey(decoded.id);
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      currentUser = JSON.parse(cachedUser);
      currentUser.passwordChangedAt = currentUser.passwordChangedAt
        ? new Date(currentUser.passwordChangedAt)
        : null;
    } else {
      currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (currentUser) {
        await redis.setEx(cacheKey, AUTH_USER_TTL, JSON.stringify(currentUser));
      }
    }

    if (!currentUser) {
      logger.warn("Unauthorized access attempt - user no longer exists", {
        userId: decoded.id,
      });
      return next(
        new AppError("User belonging to this token no longer exists", 401),
      );
    }

    // check if user changed password after token was issued

    if (changePasswordAfter(currentUser.passwordChangedAt, decoded.iat)) {
      logger.warn(
        "Unauthorized access attempt - password changed after token issued",
        { userId: currentUser.id },
      );
      return next(
        new AppError("You recently changed password, please log in again", 401),
      );
    }
    req.user = currentUser;
    next();
  },
);

export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    clearAuthCookie(res);
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  },
);

// restrict to only admin
export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn("Unauthorized role access attempt");
      return next(
        new AppError("You must be logged in to perform this action", 401),
      );
    }
    // Check if user has required role
    if (!roles.includes(req.user.roles as Role)) {
      logger.warn("Forbidden access attempt - insufficient permissions", {
        userId: req.user.id,
        requiredRoles: roles,
      });
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};

// forget password
export const forgetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      logger.warn("Password reset attempt without providing email");
      return next(new AppError("Please provide your email", 400));
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn("Password reset attempt with non-existing email", { email });
      return next(new AppError("There is no user with the email", 404));
    }

    logger.info("Generating password reset token", { email });
    const { passwordResetToken, resetToken, resetTokenExpiry } =
      createPasswordResetToken();

    // save the hashed token to database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${passwordResetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}\nIf you didn't forget your password, please ignore this email!`;

    try {
      await sendMail({
        email: user.email,
        subject: "Your password reset token (valid for 10 min)",
        message,
      });

      logger.info("Password reset token sent via email", { email });
      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });
    } catch (err) {
      await prisma.user.update({
        where: { email },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      logger.error("Error sending password reset email", { email, error: err });
      return next(
        new AppError(
          "There was an error sending the email, Please try again later",
          500,
        ),
      );
    }
  },
);

// reset password
export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;

    if (!password || !passwordConfirm) {
      logger.warn("Password reset attempt with missing fields");
      return next(
        new AppError("Please provide password and passwordConfirm", 400),
      );
    }
    if (password !== passwordConfirm) {
      logger.warn("Password reset attempt with non-matching passwords");
      return next(new AppError("Passwords do not match", 400));
    }

    // get user based on token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      logger.warn("Password reset attempt with invalid or expired token");
      return next(new AppError("Token is Invalid or has expire", 400));
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await redis.del(getAuthUserKey(user.id));

    logger.info("Password reset successful", { email: user.email });
    res.status(200).json({
      status: "success",
      message: "Password has been reset successfuly,",
    });
  },
);

// update password
export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword, passwordConfirm } = req.body;

    if (!currentPassword || !newPassword || !passwordConfirm) {
      logger.warn("Password update attempt with missing fields", {
        userId: req.user!.id,
      });
      return next(new AppError("All fields are required", 400));
    }

    if (newPassword !== passwordConfirm) {
      logger.warn("Password update attempt with non-matching new passwords", {
        userId: req.user!.id,
      });
      return next(new AppError("New passwords do not match", 400));
    }

    if (!req.user) {
      logger.warn("Password update attempt by unauthenticated user");
      return next(new AppError("You are not logged in", 401));
    }

    // 1. Get the user from DB
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) return next(new AppError("User not found", 404));

    // 2. Check if current password is correct
    const isValidPass = await comparePassword(currentPassword, user.password);

    if (!isValidPass) {
      logger.warn("Password update attempt with incorrect current password", {
        userId: user.id,
      });
      return next(new AppError("Your current password is incorrect", 401));
    }

    // 3. Hash and update new password
    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        passwordChangedAt: new Date(),
      },
    });

    // 4. Force the user to re-login — invalidate auth cache
    await redis.del(getAuthUserKey(user.id));

    logger.info("Password updated successfully, user must re-login", {
      userId: user.id,
    });
    res.status(200).json({
      status: "success",
      message: "Password updated successfully. Please log in again.",
    });
  },
);

// Verify email
export const verifyEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: hashedToken,
        verifyTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      logger.warn("Email verification attempt with invalid or expired token");
      return next(new AppError("Verification link is invalid or has expired", 400));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null,
      },
    });

    await redis.del(getAuthUserKey(user.id));

    logger.info("Email verified successfully", { email: user.email });
    res.status(200).json({
      status: "success",
      message: "Email verified successfully.",
    });
  },
);
