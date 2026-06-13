import { client as redis } from "../config/redis";
import logger from "../config/logger";

const MAX_FAILED = 5; // lock after 5 consecutive failures
const LOCK_TTL = 15 * 60; // locked for 15 minutes (seconds)
const FAIL_TTL = 10 * 60; // failure counter resets after 10 minutes

const failKey = (email: string) => `login:fail:${email.toLowerCase()}`;
const lockKey = (email: string) => `login:lock:${email.toLowerCase()}`;

/**
 * Checks if an account is currently locked due to too many failed attempts.
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  return (await redis.exists(lockKey(email))) === 1;
}

/**
 * Records a failed login attempt. Increments the failure counter and
 * locks the account if it reaches the maximum allowed failures.
 */
export async function recordFailedLogin(email: string): Promise<void> {
  const key = failKey(email);
  const current = await redis.incr(key);

  if (current === 1) {
    // First failure — start the expiry clock
    await redis.expire(key, FAIL_TTL);
  }

  if (current >= MAX_FAILED) {
    // Lock the account and clear the failure counter
    await redis.setEx(lockKey(email), LOCK_TTL, "1");
    await redis.del(key);
    logger.warn("Account temporarily locked due to repeated login failures", {
      email,
    });
  }
}

/**
 * Clears all failure counters and locks for a given email.
 */
export async function clearFailedLogins(email: string): Promise<void> {
  await redis.del(failKey(email));
  await redis.del(lockKey(email));
}
