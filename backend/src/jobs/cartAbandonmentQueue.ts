import { Queue, Worker } from "bullmq";
import { client as redis } from "../config/redis";
import { prisma } from "../config/database";
import { emailQueue } from "./emailQueue";
import logger from "../config/logger";

const parseRedisUrl = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
};
const bullConnection = parseRedisUrl(process.env.REDIS_URL || "redis://localhost:6379");

export const cartAbandonmentQueue = new Queue("cartAbandonment", {
  connection: bullConnection,
});

const ABANDON_DELAY_MS = 60 * 60 * 1000; // 1 hour
const COOLDOWN_SECONDS = 24 * 60 * 60;   // 24 hours

export const scheduleCartAbandonment = async (userId: string): Promise<void> => {
  const jobId = `cart-abandon:${userId}`;

  // Respect 24h cooldown — don't spam users
  const lastSent = await redis.get(`cart-abandon-sent:${userId}`);
  if (lastSent) return;

  // Debounce: remove existing delayed job so the timer resets on each cart action
  try {
    const existing = await cartAbandonmentQueue.getJob(jobId);
    if (existing) await existing.remove();
  } catch {
    // ignore if job no longer exists
  }

  await cartAbandonmentQueue.add(
    "send-abandonment",
    { userId },
    {
      jobId,
      delay: ABANDON_DELAY_MS,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 200 },
    },
  );
};

export const cancelCartAbandonment = async (userId: string): Promise<void> => {
  const jobId = `cart-abandon:${userId}`;
  try {
    const job = await cartAbandonmentQueue.getJob(jobId);
    if (job) await job.remove();
  } catch {
    // ignore
  }
};

new Worker(
  "cartAbandonment",
  async (job) => {
    const { userId } = job.data as { userId: string };

    // Double-check cooldown in worker (in case the Redis key was set after job was enqueued)
    const lastSent = await redis.get(`cart-abandon-sent:${userId}`);
    if (lastSent) return;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { name: true, price: true, discount: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, active: true },
    });
    if (!user || !user.active) return;

    await emailQueue.add("send-email", {
      email: user.email,
      subject: "You left something behind — your cart is waiting!",
      template: "abandonedCart",
      templateData: {
        name: user.name,
        items: cart.items.map((i) => {
          const m = i.product.discount ? 1 - i.product.discount / 100 : 1;
          return { name: i.product.name, price: (i.product.price * m).toFixed(2) };
        }),
        cartUrl: `${process.env.CLIENT_URL}/cart`,
        year: new Date().getFullYear(),
      },
    });

    await redis.set(`cart-abandon-sent:${userId}`, "1", { EX: COOLDOWN_SECONDS });
    logger.info("Abandoned cart email queued", { userId });
  },
  { connection: bullConnection },
);
