import { Queue, Worker, Job } from "bullmq";
import { prisma } from "../config/database";
import logger from "../config/logger";

const parseRedisUrl = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
};

const connection = parseRedisUrl(
  process.env.REDIS_URL || "redis://localhost:6379",
);

interface PromotionJob {
  promotionId: string;
  action: "activate" | "deactivate";
}

export const promotionQueue = new Queue<PromotionJob>("promotions", {
  connection,
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 },
});

export const schedulePromotion = async (
  promotionId: string,
  startsAt: Date,
  endsAt: Date,
) => {
  const now = Date.now();

  // Cancel any existing jobs for this promotion before scheduling new ones
  const activateJobId = `activate:${promotionId}`;
  const deactivateJobId = `deactivate:${promotionId}`;

  const [existingActivate, existingDeactivate] = await Promise.all([
    promotionQueue.getJob(activateJobId),
    promotionQueue.getJob(deactivateJobId),
  ]);
  await Promise.all([
    existingActivate?.remove(),
    existingDeactivate?.remove(),
  ]);

  const activateDelay = startsAt.getTime() - now;
  const deactivateDelay = endsAt.getTime() - now;

  if (activateDelay > 0) {
    await promotionQueue.add(
      "promotion-job",
      { promotionId, action: "activate" },
      { jobId: activateJobId, delay: activateDelay },
    );
  } else if (startsAt <= new Date() && endsAt > new Date()) {
    // Already started — activate immediately
    await prisma.promotion.update({
      where: { id: promotionId },
      data: { active: true },
    });
  }

  if (deactivateDelay > 0) {
    await promotionQueue.add(
      "promotion-job",
      { promotionId, action: "deactivate" },
      { jobId: deactivateJobId, delay: deactivateDelay },
    );
  }
};

const promotionWorker = new Worker<PromotionJob>(
  "promotions",
  async (job: Job<PromotionJob>) => {
    const { promotionId, action } = job.data;
    await prisma.promotion.update({
      where: { id: promotionId },
      data: { active: action === "activate" },
    });
    logger.info(`Promotion ${action}d`, { promotionId });
  },
  { connection },
);

promotionWorker.on("failed", (job, err) => {
  logger.error("Promotion job failed", { jobId: job?.id, error: err.message });
});
