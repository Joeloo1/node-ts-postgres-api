-- Phase 6.3: Event Tracking
CREATE TABLE "AnalyticsEvent" (
    "id"        TEXT NOT NULL,
    "sessionId" VARCHAR(100) NOT NULL,
    "userId"    TEXT,
    "event"     VARCHAR(50) NOT NULL,
    "productId" UUID,
    "metadata"  JSONB,
    "ip"        VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt" DESC);
CREATE INDEX "AnalyticsEvent_userId_idx"    ON "AnalyticsEvent"("userId");
CREATE INDEX "AnalyticsEvent_productId_idx" ON "AnalyticsEvent"("productId");
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt" DESC);
