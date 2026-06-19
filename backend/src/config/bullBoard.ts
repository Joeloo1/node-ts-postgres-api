import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "../jobs/emailQueue";
import { cartAbandonmentQueue } from "../jobs/cartAbandonmentQueue";
import { promotionQueue } from "../jobs/promotionQueue";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/v1/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(cartAbandonmentQueue),
    new BullMQAdapter(promotionQueue),
  ],
  serverAdapter,
});

export { serverAdapter };
