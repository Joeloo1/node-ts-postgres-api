import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import { emailQueue } from "../jobs/emailQueue";
import {
  shippingRateRequestSchema,
  createZoneSchema,
  updateZoneSchema,
  shipOrderSchema,
} from "../Schema/shippingSchema";

// ─── EasyPost client (lazy-initialised) ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _easypost: any = null;
const getEasyPost = () => {
  if (!process.env.EASYPOST_API_KEY) return null;
  if (!_easypost) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EasyPost = require("@easypost/api");
    _easypost = new EasyPost(process.env.EASYPOST_API_KEY);
  }
  return _easypost;
};

const FROM_ADDRESS = {
  name: process.env.STORE_NAME ?? "Northline",
  street1: process.env.WAREHOUSE_STREET ?? "123 Warehouse Ave",
  city: process.env.WAREHOUSE_CITY ?? "New York",
  state: process.env.WAREHOUSE_STATE ?? "NY",
  zip: process.env.WAREHOUSE_ZIP ?? "10001",
  country: process.env.WAREHOUSE_COUNTRY ?? "US",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getZoneForCountry = async (country: string) =>
  prisma.shippingZone.findFirst({
    where: { active: true, countries: { has: country } },
  });

// Estimate a combined parcel from quantity (no product weights in schema — use defaults)
const estimateParcel = (totalQty: number) => ({
  length: 12,
  width: 8,
  height: Math.max(2, totalQty * 2),
  weight: Math.max(4, totalQty * 8), // oz
});

// ─── Public: get shipping rates ───────────────────────────────────────────────

export const getShippingRates = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { country, zip, cartTotal } = shippingRateRequestSchema.parse(req.body);

    const ep = getEasyPost();

    // ── EasyPost live rates ────────────────────────────────────────────────
    if (ep && zip) {
      try {
        const shipment = await ep.Shipment.create({
          from_address: FROM_ADDRESS,
          to_address: { country, zip },
          parcel: estimateParcel(1),
        });

        const zone = await getZoneForCountry(country);
        const freeShipping =
          zone?.freeThreshold != null && cartTotal >= zone.freeThreshold;

        const rates = (shipment.rates ?? [])
          .map((r: { id: string; carrier: string; service: string; rate: string; delivery_days: number | null }) => ({
            id: r.id,
            carrier: r.carrier,
            service: r.service,
            rate: parseFloat(r.rate),
            deliveryDays: r.delivery_days,
            free: false,
          }))
          .sort((a: { rate: number }, b: { rate: number }) => a.rate - b.rate);

        if (freeShipping) {
          rates.unshift({
            id: "FREE",
            carrier: "Standard",
            service: "Free Shipping",
            rate: 0,
            deliveryDays: null,
            free: true,
          });
        }

        return res.status(200).json({ status: "success", data: { rates, source: "easypost" } });
      } catch (err) {
        logger.warn("EasyPost rate fetch failed, falling back to zones", { err });
      }
    }

    // ── Zone-based fallback ────────────────────────────────────────────────
    const zone = await getZoneForCountry(country);
    if (!zone) {
      return next(new AppError("Shipping is not available to this country", 400));
    }

    const freeShipping = zone.freeThreshold != null && cartTotal >= zone.freeThreshold;
    const rate = freeShipping ? 0 : zone.flatRate;

    res.status(200).json({
      status: "success",
      data: {
        rates: [
          {
            id: `zone:${zone.id}`,
            carrier: "Standard",
            service: zone.name,
            rate,
            deliveryDays: null,
            free: freeShipping,
          },
        ],
        source: "zone",
      },
    });
  },
);

// ─── Admin: shipping zones ────────────────────────────────────────────────────

export const getAllZones = catchAsync(async (_req: Request, res: Response) => {
  const zones = await prisma.shippingZone.findMany({ orderBy: { name: "asc" } });
  res.status(200).json({ status: "success", data: { zones } });
});

export const createZone = catchAsync(async (req: Request, res: Response) => {
  const data = createZoneSchema.parse(req.body);
  const zone = await prisma.shippingZone.create({ data });
  logger.info("Shipping zone created", { zoneId: zone.id, name: zone.name });
  res.status(201).json({ status: "success", data: { zone } });
});

export const updateZone = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = updateZoneSchema.parse(req.body);
    const existing = await prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Shipping zone not found", 404));
    const zone = await prisma.shippingZone.update({ where: { id }, data });
    res.status(200).json({ status: "success", data: { zone } });
  },
);

export const deleteZone = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const existing = await prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Shipping zone not found", 404));
    await prisma.shippingZone.delete({ where: { id } });
    res.status(204).send();
  },
);

// ─── Admin: ship an order (purchase label or set manual tracking) ─────────────

export const shipOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;
    const { rateId, trackingNumber, labelUrl } = shipOrderSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    if (!order) return next(new AppError("Order not found", 404));
    if (order.status === "SHIPPED" || order.status === "DELIVERED") {
      return next(new AppError("Order is already shipped", 400));
    }

    let finalTracking = trackingNumber ?? null;
    let finalLabel = labelUrl ?? null;
    let easypostShipmentId: string | undefined;

    // Use EasyPost to purchase label if rateId provided and EP is configured
    const ep = getEasyPost();
    if (ep && rateId && !rateId.startsWith("zone:") && rateId !== "FREE") {
      try {
        const shipment = await ep.Shipment.buy(order.easypostShipmentId ?? rateId, { id: rateId });
        finalTracking = shipment.tracking_code ?? finalTracking;
        finalLabel = shipment.postage_label?.label_url ?? finalLabel;
        easypostShipmentId = shipment.id;
      } catch (err) {
        logger.warn("EasyPost label purchase failed", { orderId, rateId, err });
        // Continue with manual tracking if EP fails
      }
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        shippedAt: new Date(),
        ...(finalTracking && { trackingNumber: finalTracking }),
        ...(finalLabel && { shippingLabel: finalLabel }),
        ...(easypostShipmentId && { easypostShipmentId }),
      },
    });

    // Queue shipped email
    await emailQueue
      .add("send-email", {
        email: order.user.email,
        subject: "Your Northline order has shipped!",
        template: "orderStatus",
        templateData: {
          name: order.user.name,
          orderId: order.id.slice(0, 8).toUpperCase(),
          statusLabel: "Shipped",
          statusMessage:
            "Your order is on its way. You will receive it within the estimated delivery window.",
          trackingNumber: finalTracking,
        },
      })
      .catch((err) => logger.warn("Failed to queue shipped email", { err }));

    logger.info("Order shipped", { orderId, tracking: finalTracking });
    res.status(200).json({ status: "success", data: { order: updated } });
  },
);

// ─── Public: EasyPost carrier tracking webhook ────────────────────────────────

export const carrierTrackingWebhook = catchAsync(
  async (req: Request, res: Response) => {
    // EasyPost sends the event as JSON in the body
    const event = req.body as {
      description?: string;
      result?: { tracking_code?: string; status?: string };
    };

    const trackingCode = event.result?.tracking_code;
    const status = event.result?.status;

    if (!trackingCode || !status) {
      return res.status(200).json({ received: true });
    }

    logger.info("Carrier tracking event", { trackingCode, status });

    const order = await prisma.order.findFirst({
      where: { trackingNumber: trackingCode },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!order) return res.status(200).json({ received: true });

    if (status === "delivered" && order.status !== "DELIVERED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED" },
      });

      // Queue delivered email
      await emailQueue
        .add("send-email", {
          email: order.user.email,
          subject: "Your Northline order has been delivered",
          template: "orderStatus",
          templateData: {
            name: order.user.name,
            orderId: order.id.slice(0, 8).toUpperCase(),
            statusLabel: "Delivered",
            statusMessage: "Your order has been delivered. We hope you enjoy your purchase!",
            trackingNumber: trackingCode,
          },
        })
        .catch((err) => logger.warn("Failed to queue delivered email", { err }));

      // Schedule review request 7 days later
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      await emailQueue
        .add(
          "send-email",
          {
            email: order.user.email,
            subject: "How was your Northline order?",
            template: "reviewRequest",
            templateData: {
              name: order.user.name,
              orderId: order.id.slice(0, 8).toUpperCase(),
              ordersUrl: `${process.env.CLIENT_URL}/orders`,
              year: new Date().getFullYear(),
            },
          },
          { delay: SEVEN_DAYS },
        )
        .catch((err) => logger.warn("Failed to schedule review request", { err }));

      logger.info("Order marked DELIVERED via carrier webhook", { orderId: order.id });
    } else if (status === "in_transit" && order.status === "SHIPPED") {
      // Already SHIPPED — nothing to update, but log it
      logger.info("Carrier tracking: in_transit", { orderId: order.id });
    }

    res.status(200).json({ received: true });
  },
);
