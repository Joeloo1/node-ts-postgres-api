import { Queue, Worker, Job } from "bullmq";
import sendMail from "../utils/email";
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

interface EmailJob {
  email: string;
  subject: string;
  message?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s retries
  removeOnComplete: 100, // keep last 100 completed jobs for inspection
  removeOnFail: 500,
};

export const emailQueue = new Queue<EmailJob>("emails", {
  connection,
  defaultJobOptions,
});

/**
 * WORKERS
 */
const emailWorker = new Worker<EmailJob>(
  "emails",
  async (job: Job<EmailJob>) => {
    await sendMail(job.data);
    logger.info("Email job completed", { jobId: job.id, to: job.data.email });
  },
  { connection, concurrency: 5 },
);

emailWorker.on("failed", (job, err) => {
  logger.error("Email job failed", {
    jobId: job?.id,
    to: job?.data.email,
    attempt: job?.attemptsMade,
    error: err.message,
  });
});

emailWorker.on("error", (err) => {
  logger.error("Email worker error", { error: err.message });
});
