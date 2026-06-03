import jwt from "jsonwebtoken";
import logger from "../config/logger";

const expires = process.env.JWT_EXPIRES_IN || "15m";
logger.info(`JWT token will expire in: ${expires}`);
const options = {
  expiresIn: expires,
} as jwt.SignOptions;

export const signAccessToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, options);
};

export const signRefreshToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });
};
