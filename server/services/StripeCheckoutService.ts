import Stripe from "stripe";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { stripeCheckoutFulfillments } from "../../shared/schema";
import { UserStatsService } from "./UserStatsService";

export type HeartsPackageId = "small" | "medium" | "large";
export type SubscriptionPlan = "monthly" | "yearly";
export type StripeCheckoutType = "hearts_package" | "unlimited_hearts_subscription";

type HeartsPackageConfig = {
  hearts: number;
  amountUsdCents: number;
  name: string;
};

type SubscriptionPlanConfig = {
  days: number;
  amountUsdCents: number;
  name: string;
};

const HEARTS_PACKAGES: Record<HeartsPackageId, HeartsPackageConfig> = {
  small: { hearts: 5, amountUsdCents: 99, name: "5 Hearts" },
  medium: { hearts: 15, amountUsdCents: 249, name: "15 Hearts" },
  large: { hearts: 35, amountUsdCents: 499, name: "35 Hearts" },
};

const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  monthly: { days: 30, amountUsdCents: 999, name: "Unlimited Hearts Monthly" },
  yearly: { days: 365, amountUsdCents: 8999, name: "Unlimited Hearts Yearly" },
};

type HeartsFulfillmentPayload = {
  checkoutType: "hearts_package";
  packageId: HeartsPackageId;
  success: boolean;
  hearts: number;
  heartsAdded: number;
  amountUsdCents: number;
  currency: "USD";
  transactionId: string;
};

type UnlimitedHeartsFulfillmentPayload = {
  checkoutType: "unlimited_hearts_subscription";
  plan: SubscriptionPlan;
  success: boolean;
  amountUsdCents: number;
  expiresAt: string;
  transactionId: string;
};

export type StripeFulfillmentPayload = HeartsFulfillmentPayload | UnlimitedHeartsFulfillmentPayload;

export type StripeConfirmResult = StripeFulfillmentPayload & {
  alreadyFulfilled: boolean;
};

export class StripeCheckoutError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "StripeCheckoutError";
    this.statusCode = statusCode;
  }
}

function isHeartsPackageId(value: unknown): value is HeartsPackageId {
  return value === "small" || value === "medium" || value === "large";
}

function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return value === "monthly" || value === "yearly";
}

function isStripeCheckoutType(value: unknown): value is StripeCheckoutType {
  return value === "hearts_package" || value === "unlimited_hearts_subscription";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Payment confirmation failed";
}

export class StripeCheckoutService {
  private static stripeClient: Stripe | null | undefined;

  static isConfigured(): boolean {
    return !!this.getStripeClient();
  }

  static normalizeHeartsPackageId(value: unknown): HeartsPackageId {
    return isHeartsPackageId(value) ? value : "small";
  }

  static normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
    return isSubscriptionPlan(value) ? value : "monthly";
  }

  static sanitizeReturnPath(value: unknown, fallback: string): string {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
      return fallback;
    }

    return trimmed;
  }

  static async createHeartsCheckoutSession(params: {
    userId: string;
    packageId: HeartsPackageId;
    baseUrl: string;
    returnPath: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    const stripe = this.requireStripeClient();
    const selectedPackage = HEARTS_PACKAGES[params.packageId];

    const successUrl = this.buildReturnUrl(params.baseUrl, params.returnPath, {
      stripe: "success",
      checkout: "hearts",
      session_id: "{CHECKOUT_SESSION_ID}",
    });

    const cancelUrl = this.buildReturnUrl(params.baseUrl, params.returnPath, {
      stripe: "cancel",
      checkout: "hearts",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: params.userId,
      allow_promotion_codes: true,
      metadata: {
        userId: params.userId,
        checkoutType: "hearts_package",
        packageId: params.packageId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: selectedPackage.amountUsdCents,
            product_data: {
              name: selectedPackage.name,
              description: "Use hearts to continue lessons after daily free limits.",
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new StripeCheckoutError("Stripe checkout URL was not returned", 502);
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  static async createUnlimitedHeartsCheckoutSession(params: {
    userId: string;
    plan: SubscriptionPlan;
    baseUrl: string;
    returnPath: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    const stripe = this.requireStripeClient();
    const selectedPlan = SUBSCRIPTION_PLANS[params.plan];

    const successUrl = this.buildReturnUrl(params.baseUrl, params.returnPath, {
      stripe: "success",
      checkout: "unlimited_hearts",
      session_id: "{CHECKOUT_SESSION_ID}",
    });

    const cancelUrl = this.buildReturnUrl(params.baseUrl, params.returnPath, {
      stripe: "cancel",
      checkout: "unlimited_hearts",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: params.userId,
      allow_promotion_codes: true,
      metadata: {
        userId: params.userId,
        checkoutType: "unlimited_hearts_subscription",
        plan: params.plan,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: selectedPlan.amountUsdCents,
            product_data: {
              name: selectedPlan.name,
              description: "Unlock unlimited hearts for uninterrupted lesson progression.",
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new StripeCheckoutError("Stripe checkout URL was not returned", 502);
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  static async confirmCheckoutSession(userId: string, sessionId: string): Promise<StripeConfirmResult> {
    const stripe = this.requireStripeClient();
    const trimmedSessionId = sessionId.trim();

    if (!trimmedSessionId) {
      throw new StripeCheckoutError("Session ID is required", 400);
    }

    const session = await stripe.checkout.sessions.retrieve(trimmedSessionId);

    if (!session) {
      throw new StripeCheckoutError("Checkout session not found", 404);
    }

    const metadataUserId = session.metadata?.userId || session.client_reference_id;
    if (!metadataUserId || metadataUserId !== userId) {
      throw new StripeCheckoutError("Checkout session does not belong to this user", 403);
    }

    const checkoutTypeRaw = session.metadata?.checkoutType;
    if (!isStripeCheckoutType(checkoutTypeRaw)) {
      throw new StripeCheckoutError("Unsupported checkout session type", 400);
    }

    if (session.status !== "complete") {
      throw new StripeCheckoutError("Checkout is not complete yet", 400);
    }

    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      throw new StripeCheckoutError("Payment has not been completed", 400);
    }

    const packageId = this.normalizeHeartsPackageId(session.metadata?.packageId);
    const plan = this.normalizeSubscriptionPlan(session.metadata?.plan);
    const now = new Date();

    await db
      .insert(stripeCheckoutFulfillments)
      .values({
        sessionId: trimmedSessionId,
        userId,
        checkoutType: checkoutTypeRaw,
        packageId: checkoutTypeRaw === "hearts_package" ? packageId : null,
        plan: checkoutTypeRaw === "unlimited_hearts_subscription" ? plan : null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: stripeCheckoutFulfillments.sessionId });

    const [existingRecord] = await db
      .select({
        id: stripeCheckoutFulfillments.id,
        userId: stripeCheckoutFulfillments.userId,
        status: stripeCheckoutFulfillments.status,
        fulfillmentPayload: stripeCheckoutFulfillments.fulfillmentPayload,
      })
      .from(stripeCheckoutFulfillments)
      .where(eq(stripeCheckoutFulfillments.sessionId, trimmedSessionId));

    if (!existingRecord) {
      throw new StripeCheckoutError("Could not initialize fulfillment state", 500);
    }

    if (existingRecord.userId !== userId) {
      throw new StripeCheckoutError("Checkout session does not belong to this user", 403);
    }

    if (existingRecord.status === "fulfilled" && existingRecord.fulfillmentPayload) {
      return {
        ...(existingRecord.fulfillmentPayload as StripeFulfillmentPayload),
        alreadyFulfilled: true,
      };
    }

    const [claim] = await db
      .update(stripeCheckoutFulfillments)
      .set({
        status: "processing",
        updatedAt: new Date(),
        lastError: null,
      })
      .where(
        and(
          eq(stripeCheckoutFulfillments.sessionId, trimmedSessionId),
          inArray(stripeCheckoutFulfillments.status, ["pending", "failed"]),
        ),
      )
      .returning({ id: stripeCheckoutFulfillments.id });

    if (!claim) {
      const [freshRecord] = await db
        .select({
          status: stripeCheckoutFulfillments.status,
          fulfillmentPayload: stripeCheckoutFulfillments.fulfillmentPayload,
        })
        .from(stripeCheckoutFulfillments)
        .where(eq(stripeCheckoutFulfillments.sessionId, trimmedSessionId));

      if (freshRecord?.status === "fulfilled" && freshRecord.fulfillmentPayload) {
        return {
          ...(freshRecord.fulfillmentPayload as StripeFulfillmentPayload),
          alreadyFulfilled: true,
        };
      }

      throw new StripeCheckoutError("Payment confirmation is already in progress. Please retry shortly.", 409);
    }

    try {
      let fulfillmentPayload: StripeFulfillmentPayload;

      if (checkoutTypeRaw === "hearts_package") {
        const result = await UserStatsService.purchaseHeartsWithMoney(userId, packageId);
        fulfillmentPayload = {
          checkoutType: "hearts_package",
          packageId,
          success: result.success,
          hearts: result.hearts,
          heartsAdded: result.heartsAdded,
          amountUsdCents: result.amountUsdCents,
          currency: result.currency,
          transactionId: result.transactionId,
        };
      } else {
        const result = await UserStatsService.purchaseUnlimitedHeartsSubscription(userId, plan);
        fulfillmentPayload = {
          checkoutType: "unlimited_hearts_subscription",
          plan,
          success: result.success,
          amountUsdCents: result.amountUsdCents,
          expiresAt: result.expiresAt,
          transactionId: result.transactionId,
        };
      }

      await db
        .update(stripeCheckoutFulfillments)
        .set({
          status: "fulfilled",
          fulfillmentPayload,
          fulfilledAt: new Date(),
          updatedAt: new Date(),
          lastError: null,
        })
        .where(eq(stripeCheckoutFulfillments.sessionId, trimmedSessionId));

      return {
        ...fulfillmentPayload,
        alreadyFulfilled: false,
      };
    } catch (error) {
      await db
        .update(stripeCheckoutFulfillments)
        .set({
          status: "failed",
          updatedAt: new Date(),
          lastError: toErrorMessage(error).slice(0, 500),
        })
        .where(eq(stripeCheckoutFulfillments.sessionId, trimmedSessionId));

      if (error instanceof StripeCheckoutError) {
        throw error;
      }

      throw new StripeCheckoutError(toErrorMessage(error), 500);
    }
  }

  private static getStripeClient(): Stripe | null {
    if (this.stripeClient !== undefined) {
      return this.stripeClient;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.stripeClient = null;
      return this.stripeClient;
    }

    this.stripeClient = new Stripe(secretKey);
    return this.stripeClient;
  }

  private static requireStripeClient(): Stripe {
    const stripe = this.getStripeClient();
    if (!stripe) {
      throw new StripeCheckoutError("Stripe is not configured", 503);
    }
    return stripe;
  }

  private static buildReturnUrl(baseUrl: string, returnPath: string, params: Record<string, string>): string {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL(returnPath, normalizedBase);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }
}
