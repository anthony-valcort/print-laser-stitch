import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

const SCOPES = "write_draft_orders,read_products";

/**
 * One-shot OAuth handler for installing the Shopify custom app and grabbing the
 * Admin API access token. Handles both phases:
 *
 *   1. Initial load (no `code` param) → redirects to Shopify's authorize URL.
 *   2. Callback after merchant approval (has `code`) → exchanges the temporary
 *      code for a permanent `shpat_...` access token and renders it on screen
 *      so it can be copied into env vars.
 *
 * Once the token is captured and stored, this route can be deleted.
 */
export async function GET(req: NextRequest) {
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return text(
      "Missing env vars on Vercel: SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET",
      500,
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const hmac = url.searchParams.get("hmac");

  if (!shop) {
    return text(
      "Missing 'shop' parameter. Append ?shop=YOUR-STORE.myshopify.com",
      400,
    );
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    return text("Invalid shop domain format", 400);
  }

  // Phase 1 — no code yet, kick off OAuth by redirecting to Shopify
  if (!code) {
    const redirectUri = `${url.origin}/api/auth/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    const authUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;
    return NextResponse.redirect(authUrl);
  }

  // Phase 2 — Shopify called us back with a code; verify HMAC then exchange
  if (!hmac) return text("Missing HMAC on callback", 400);

  const params = new URLSearchParams(url.search);
  params.delete("hmac");
  params.delete("signature");
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const expected = crypto
    .createHmac("sha256", CLIENT_SECRET)
    .update(sorted)
    .digest("hex");

  if (
    expected.length !== hmac.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))
  ) {
    return text("HMAC verification failed", 400);
  }

  const exchange = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  if (!exchange.ok) {
    const errorBody = await exchange.text();
    return text(
      `Token exchange failed (${exchange.status}): ${errorBody}`,
      500,
    );
  }

  const data = (await exchange.json()) as {
    access_token: string;
    scope: string;
  };

  return new Response(renderTokenPage(shop, data.access_token, data.scope), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function renderTokenPage(shop: string, token: string, scope: string) {
  const safeShop = escapeHtml(shop);
  const safeToken = escapeHtml(token);
  const safeScope = escapeHtml(scope);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Shopify access token</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui,-apple-system,sans-serif; max-width: 720px; margin: 40px auto; padding: 24px; background: #030140; color: #fff; line-height: 1.55 }
  h1 { color: #facc15; margin: 0 0 8px }
  .meta { color: #94a3b8; font-size: 13px; margin: 0 0 24px }
  .box { background: #1a1660; padding: 16px; border-radius: 12px; font-family: ui-monospace,Menlo,monospace; font-size: 13px; word-break: break-all; white-space: pre-wrap; border: 1px solid rgba(255,255,255,0.1); margin: 12px 0 }
  .btn { background: #facc15; color: #422006; border: 0; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-right: 8px }
  .btn:hover { filter: brightness(1.05) }
  .warn { background: #422006; color: #fde68a; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin: 16px 0 }
  code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 13px }
  h2 { font-size: 16px; margin-top: 28px }
</style>
</head>
<body>
<h1>✅ Access token generated</h1>
<p class="meta">Store: <strong>${safeShop}</strong> &middot; Scopes: <code>${safeScope}</code></p>

<div class="warn">⚠️ This token won't be shown again — copy it now and store it in <code>.env.local</code> and your Vercel project's environment variables.</div>

<h2>Add to .env.local and Vercel env vars</h2>
<div class="box" id="env">SHOPIFY_STORE_DOMAIN=${safeShop}
SHOPIFY_ADMIN_TOKEN=${safeToken}</div>

<button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('env').textContent).then(()=>alert('Copied env block'))">Copy env block</button>
<button class="btn" onclick="navigator.clipboard.writeText('${safeToken}').then(()=>alert('Copied token'))">Copy token only</button>

<p class="meta" style="margin-top: 32px">Once stored, this <code>/api/auth/callback</code> route is no longer needed and can be deleted.</p>
</body>
</html>`;
}
