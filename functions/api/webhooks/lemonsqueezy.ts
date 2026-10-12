import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface Env {
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  VITE_LS_PRO_MONTHLY_VARIANT_ID: string;
  VITE_LS_PRO_ANNUAL_VARIANT_ID: string;
  CF_PAGES_URL?: string;
  INTERNAL_WEBHOOK_SECRET?: string;
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (hex.length !== signature.length) return false;
  const encoder2 = new TextEncoder();
  const a = encoder2.encode(hex);
  const b = encoder2.encode(signature);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

interface Attributes {
  status?: string;
  variant_id?: string;
  customer_id?: string;
  ends_at?: string | null;
  first_subscription_item?: { variant_id?: string };
}

interface Payload {
  meta?: { custom_data?: { user_id?: string } };
  data?: {
    attributes?: Attributes;
    id?: string;
  };
}

type Supabase = SupabaseClient;
type Tier = "pro" | "lab";

function variantIdOf(attributes: Attributes): string {
  return String(attributes.variant_id ?? attributes.first_subscription_item?.variant_id ?? "");
}

async function onOrderCreated(supabase: Supabase, env: Env, userId: string, payload: Payload) {
  await supabase.from("reports").insert({
    user_id: userId,
    order_id: payload.data?.id ?? "",
    status: "pending",
  });
  const baseUrl = env.CF_PAGES_URL ?? "https://betbacktest.com";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.INTERNAL_WEBHOOK_SECRET) {
    headers["x-internal-secret"] = env.INTERNAL_WEBHOOK_SECRET;
  }
  // Report generation runs on its own; the webhook answers without waiting.
  fetch(`${baseUrl}/api/generate-report`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId, orderId: payload.data?.id }),
  }).catch(console.error);
}

async function onSubscriptionCreated(supabase: Supabase, userId: string, payload: Payload, tierOf: (variantId: string) => Tier) {
  const attributes = payload.data?.attributes;
  if (!attributes) return;
  await supabase
    .from("profiles")
    .update({
      subscription_tier: tierOf(variantIdOf(attributes)),
      lemon_customer_id: String(attributes.customer_id ?? ""),
      lemon_subscription_id: payload.data?.id ?? "",
      subscription_status: "active",
      subscription_ends_at: null,
    })
    .eq("id", userId);
}

async function onSubscriptionUpdated(supabase: Supabase, userId: string, payload: Payload, tierOf: (variantId: string) => Tier) {
  const attributes = payload.data?.attributes;
  if (!attributes) return;
  const status = attributes.status;
  const updates: Record<string, unknown> = {
    subscription_status: status,
    subscription_tier: tierOf(variantIdOf(attributes)),
  };
  if (status === "cancelled") updates.subscription_ends_at = attributes.ends_at;
  if (status === "expired" || status === "paused") {
    updates.subscription_tier = "free";
    updates.subscription_status = status;
  }
  await supabase.from("profiles").update(updates).eq("id", userId);
}

async function setSubscriptionStatus(supabase: Supabase, userId: string, status: string) {
  await supabase.from("profiles").update({ subscription_status: status }).eq("id", userId);
}

// Every event we act on belongs to a user, passed through checkout custom data.
async function handleEvent(event: string, payload: Payload, env: Env): Promise<void> {
  const userId = payload.meta?.custom_data?.user_id;
  if (!userId) return;

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const proVariants = new Set([env.VITE_LS_PRO_MONTHLY_VARIANT_ID, env.VITE_LS_PRO_ANNUAL_VARIANT_ID]);
  const tierOf = (variantId: string): Tier => (proVariants.has(variantId) ? "pro" : "lab");

  switch (event) {
    case "order_created":
      return onOrderCreated(supabase, env, userId, payload);
    case "subscription_created":
      return onSubscriptionCreated(supabase, userId, payload, tierOf);
    case "subscription_updated":
      return onSubscriptionUpdated(supabase, userId, payload, tierOf);
    case "subscription_payment_success":
      return setSubscriptionStatus(supabase, userId, "active");
    case "subscription_payment_failed":
      return setSubscriptionStatus(supabase, userId, "past_due");
    default:
      // Other events are acknowledged and ignored.
      return;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // The signature is checked before the payload is parsed or Supabase is touched.
  const signature = request.headers.get("x-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 403 });

  const rawBody = await request.text();
  const valid = await verifySignature(rawBody, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  if (!valid) return Response.json({ error: "Invalid signature" }, { status: 403 });

  const event = request.headers.get("x-event-name") ?? "";
  const payload = JSON.parse(rawBody) as Payload;

  try {
    await handleEvent(event, payload, env);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
};

export const onRequest: PagesFunction<Env> = (context) => {
  if (context.request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  return onRequestPost(context);
};
