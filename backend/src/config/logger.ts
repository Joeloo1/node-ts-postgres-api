import fs from "fs";
import path from "path";
import winston from "winston";
import { requestContext } from "../middleware/requestId";

const logDir = path.join(process.cwd(), "logs");
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {
  /* ignore — file transports may still work or fall back to console-only below */
}

const { combine, colorize, printf, timestamp, errors, json } = winston.format;

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

const withRequestId = winston.format((info) => {
  info.requestId = requestContext.getStore()?.requestId ?? "-";
  return info;
});

const consoleFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  withRequestId(),
  colorize({ all: true }),
  printf((info) => {
    const { timestamp, level, message, requestId, ...meta } = info;
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `[${timestamp}] [${requestId}] ${level}: ${message} ${metaStr}`;
  }),
);

const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  withRequestId(),
  errors({ stack: true }),
  json(),
);

// Create Transport
const transports: winston.transport[] = [
  new winston.transports.Console({ format: consoleFormat }),
  new winston.transports.File({
    filename: path.join(logDir, "error.log"),
    level: "error",
    format: fileFormat,
    maxsize: 5242880,
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(logDir, "combine.log"),
    format: fileFormat,
    maxsize: 5242880,
    maxFiles: 5,
  }),
];

const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.logs"),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
      format: fileFormat,
    }),
  ],
});

export default logger;
