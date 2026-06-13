import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";

interface RequestContext {
  requestId: string;
  userId?: string;
}

export const setContextUserId = (userId: string) => {
  const store = requestContext.getStore();
  if (store) store.userId = userId;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  requestContext.run({ requestId }, next);
};
