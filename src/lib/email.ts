import { Resend } from "resend";
import { getSettings } from "@/lib/settings";
import { logSystemEvent } from "@/lib/audit";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const SHIPPING_LABELS: Record<string, string> = {
  courier: "Courier (DPD)",
  inpost: "InPost Parcel Locker",
  pickup: "In-store Pickup",
};

const PAYMENT_LABELS: Record<string, string> = {
  paypal: "PayPal",
  cod: "Cash on Delivery",
};

const LEAF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:8px"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.78 12-10 12Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;

function emailWrapper(content: string, storeName: string, footerExtra?: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a4d1a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">${LEAF_SVG}<span style="vertical-align:middle">Leafy</span></h1>
        <p style="color:#86efac;margin:4px 0 0;font-size:12px">Premium Teas & Coffees</p>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none">
        ${content}
      </div>
      <div style="padding:16px;text-align:center;font-size:12px;color:#999;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        ${footerExtra ? `<p style="margin:0 0 4px">${footerExtra}</p>` : ""}
        <p style="margin:0">${storeName} · leafyshop.eu</p>
      </div>
    </div>
  `;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: { productName: string; variantDesc: string; quantity: number; totalPrice: number }[];
  subtotal: number;
  discountAmount: number;
  vatRate?: number;
  vatAmount?: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  shippingAddress: string;
  orderId?: number;
  wantsInvoice?: boolean;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping order confirmation email to", data.customerEmail);
    return;
  }

  const cfg = await getSettings();
  const ordersFrom = cfg["email.orders_from"] || "orders@leafyshop.eu";
  const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";
  const storeEmail = cfg["store.email"] || "support@leafyshop.eu";
  const orderGreeting = (cfg["email.tpl.order_greeting"] || "Hi {name}, thank you for your order!")
    .replace("{name}", escapeHtml(data.customerName));

  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.productName)}<br><small style="color:#666">${escapeHtml(item.variantDesc)}</small></td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.totalPrice / 100).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const shippingLabel = SHIPPING_LABELS[data.shippingMethod] || data.shippingMethod;
  const paymentLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod;
  const isPaid = data.paymentMethod === "paypal";
  const isCod = data.paymentMethod === "cod";

  let deliveryMessage = "";
  if (isCod) {
    deliveryMessage = `
      <div style="background:#fff7ed;border:1px solid #fed7aa;padding:16px;border-radius:8px;margin:16px 0">
        <strong style="color:#c2410c">Payment on Delivery</strong>
        <p style="margin:8px 0 0;font-size:14px;color:#9a3412">
          A courier will deliver your order to the address below. Please have <strong>$${(data.total / 100).toFixed(2)}</strong> ready for payment upon delivery.
        </p>
      </div>
    `;
  } else if (isPaid) {
    deliveryMessage = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:16px 0">
        <strong style="color:#15803d">✓ Payment Confirmed</strong>
        <p style="margin:8px 0 0;font-size:14px;color:#166534">
          Your payment via ${paymentLabel} has been received. We'll start preparing your order right away.
        </p>
      </div>
    `;
  }

  let shippingMessage = "";
  if (data.shippingMethod === "courier") {
    shippingMessage = `Your order will be delivered by <strong>${shippingLabel}</strong> to:`;
  } else if (data.shippingMethod === "inpost") {
    shippingMessage = `Your order will be delivered to your <strong>${shippingLabel}</strong>:`;
  } else if (data.shippingMethod === "pickup") {
    shippingMessage = `Your order will be ready for <strong>in-store pickup</strong> at:`;
  }

  const html = emailWrapper(`
    <h2 style="color:#1a4d1a;margin-top:0">${orderGreeting}</h2>
    <p>Your order <strong>${escapeHtml(data.orderNumber)}</strong> has been ${isPaid ? "paid and confirmed" : "received"}.</p>

    ${deliveryMessage}

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px;text-align:left;font-size:14px">Product</th>
          <th style="padding:8px;text-align:center;font-size:14px">Qty</th>
          <th style="padding:8px;text-align:right;font-size:14px">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <table style="width:100%;margin:16px 0;font-size:14px">
      <tr><td style="padding:4px 0">Subtotal</td><td style="text-align:right">$${(data.subtotal / 100).toFixed(2)}</td></tr>
      ${data.discountAmount > 0 ? `<tr style="color:#15803d"><td style="padding:4px 0">Discount</td><td style="text-align:right">-$${(data.discountAmount / 100).toFixed(2)}</td></tr>` : ""}
      ${data.vatAmount && data.vatAmount > 0 ? `<tr style="color:#666"><td style="padding:4px 0">incl. VAT (${data.vatRate || 0}%)</td><td style="text-align:right">$${(data.vatAmount / 100).toFixed(2)}</td></tr>` : ""}
      <tr><td style="padding:4px 0">Shipping (${shippingLabel})</td><td style="text-align:right">${data.shippingCost === 0 ? "Free" : `$${(data.shippingCost / 100).toFixed(2)}`}</td></tr>
      <tr style="font-weight:bold;font-size:16px;border-top:2px solid #e5e7eb">
        <td style="padding:8px 0">Total</td><td style="text-align:right">$${(data.total / 100).toFixed(2)}</td>
      </tr>
    </table>

    <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;font-size:14px">
      <p style="margin:0 0 4px"><strong>Delivery:</strong></p>
      <p style="margin:0;color:#666">${shippingMessage}</p>
      <p style="margin:4px 0 0;color:#666">${escapeHtml(data.shippingAddress)}</p>
      <p style="margin:8px 0 0"><strong>Payment:</strong> ${paymentLabel}</p>
    </div>

    ${data.wantsInvoice && isPaid && data.orderId ? `
    <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px">
      📄 <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu"}/api/invoices/${data.orderId}" style="color:#15803d">Download your invoice</a>
    </div>
    ` : ""}

    <p style="color:#666;font-size:13px">You can track your order status at any time: <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu"}/order/status" style="color:#15803d">Track your order →</a></p>
  `, storeName, cfg["email.tpl.footer"]);

  try {
    await resend.emails.send({
      from: `Leafy <${ordersFrom}>`,
      to: data.customerEmail,
      subject: isPaid
        ? `Payment Confirmed — Order ${data.orderNumber}`
        : `Order Confirmed — ${data.orderNumber}`,
      html,
    });
    console.log("[EMAIL] Order confirmation sent to", data.customerEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[EMAIL] Failed to send order confirmation:", message);
    await logSystemEvent({
      action: "email_failed",
      entityType: "email",
      entityId: data.orderId,
      entityName: data.orderNumber,
      details: { kind: "order_confirmation", to: data.customerEmail, error: message },
    });
  }
}

export async function sendOrderStatusEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  newStatus: string,
  shippingMethod?: string,
  paymentMethod?: string,
  note?: string,
  changedBy?: string,
  productTypes?: string[],
  trackingNumber?: string,
) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping status email to", customerEmail);
    return;
  }

  const cfg = await getSettings();
  const noreplyFrom = cfg["email.noreply_from"] || "noreply@leafyshop.eu";
  const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";
  const storeEmail = cfg["store.email"] || "support@leafyshop.eu";
  const storeAddress = cfg["store.address"] || "5 Leafy Lane, Warsaw, Poland";

  const shippingLabel = SHIPPING_LABELS[shippingMethod || "courier"] || shippingMethod;

  // Read customizable templates from settings
  const tpl = (key: string, fallback: string) => (cfg[`email.tpl.${key}`] || fallback)
    .replace(/\{name\}/g, escapeHtml(customerName))
    .replace(/\{orderNumber\}/g, escapeHtml(orderNumber))
    .replace(/\{storeEmail\}/g, escapeHtml(storeEmail));

  const statusConfig: Record<string, { subject: string; heading: string; message: string; color: string; bgColor: string }> = {
    paid: {
      subject: `Payment Confirmed — Order ${escapeHtml(orderNumber)}`,
      heading: "Payment Confirmed ✓",
      message: tpl("status_paid", "Your payment has been received. We'll start preparing your order shortly."),
      color: "#15803d",
      bgColor: "#f0fdf4",
    },
    processing: {
      subject: `Order ${escapeHtml(orderNumber)} — Being Prepared`,
      heading: "Your Order is Being Prepared",
      message: tpl("status_processing", "Our team is carefully packing your teas and coffees. We'll notify you once it's shipped."),
      color: "#a16207",
      bgColor: "#fefce8",
    },
    shipped: {
      subject: `Order ${escapeHtml(orderNumber)} — Shipped!`,
      heading: "Your Order Has Been Shipped! 📦",
      message: tpl("status_shipped", shippingMethod === "inpost"
        ? `Your package is on its way to your InPost Parcel Locker. You'll receive a code to pick it up.`
        : shippingMethod === "pickup"
          ? `Your order is ready for pickup at our store (${storeAddress}). Mon–Fri 10am–6pm.`
          : `Your package is on its way via ${shippingLabel}. It should arrive within 2–4 business days.`),
      color: "#7c3aed",
      bgColor: "#f5f3ff",
    },
    delivered: {
      subject: `Order ${escapeHtml(orderNumber)} — Delivered`,
      heading: "Your Order Has Been Delivered ✓",
      message: tpl("status_delivered", `We hope you enjoy your products! If you have any questions, don't hesitate to contact us at ${storeEmail}.`),
      color: "#15803d",
      bgColor: "#f0fdf4",
    },
    cancelled: {
      subject: `Order ${escapeHtml(orderNumber)} — Cancelled`,
      heading: "Your Order Has Been Cancelled",
      message: tpl("status_cancelled", paymentMethod === "cod"
        ? "Your order has been cancelled. Since no payment was made, no refund is needed. All reserved items have been returned to stock."
        : `Your order has been cancelled. All reserved items have been returned to stock. Your payment will be refunded within 5–10 business days.`),
      color: "#dc2626",
      bgColor: "#fef2f2",
    },
    returned: {
      subject: `Order ${escapeHtml(orderNumber)} — Return Processed`,
      heading: "Your Return Has Been Processed",
      message: tpl("status_returned", "We've received your return. Your refund will be processed within 5–10 business days."),
      color: "#ea580c",
      bgColor: "#fff7ed",
    },
  };

  const config = statusConfig[newStatus];
  if (!config) return;

  const html = emailWrapper(`
    <h2 style="color:#1a4d1a;margin-top:0">Hi ${escapeHtml(customerName)},</h2>
    <p>Here's an update on your order <strong>${escapeHtml(orderNumber)}</strong>:</p>
    <div style="background:${config.bgColor};padding:16px;border-radius:8px;text-align:center;margin:16px 0">
      <span style="font-size:20px;font-weight:bold;color:${config.color}">${config.heading}</span>
      <p style="margin:8px 0 0;font-size:14px;color:#666">${config.message}</p>
    </div>
    ${newStatus === "shipped" && trackingNumber ? `<div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:14px"><strong>Tracking Number:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px">${escapeHtml(trackingNumber)}</code></div>` : ""}
    ${note ? `<p style="color:#666;font-size:14px"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}
    ${newStatus === "cancelled" || newStatus === "returned"
      ? `<p style="text-align:center;margin:16px 0">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu"}/products" style="display:inline-block;background:#15803d;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Shop Again →</a>
        </p>`
      : newStatus === "delivered"
        ? `<p style="text-align:center;margin:16px 0">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu"}/products" style="display:inline-block;background:#15803d;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Browse More Products →</a>
          </p>`
        : `<p style="color:#666;font-size:13px">Track your order: <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu"}/order/status" style="color:#15803d">Track your order →</a></p>`
    }
  `, storeName, cfg["email.tpl.footer"]);

  try {
    await resend.emails.send({
      from: `Leafy <${noreplyFrom}>`,
      to: customerEmail,
      subject: config.subject,
      html,
    });
    console.log("[EMAIL] Status update sent to", customerEmail);
  } catch (error) {
    console.error("[EMAIL] Failed to send status email:", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  password: string,
  loginUrl: string,
  role: string,
) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping welcome email to", email);
    return;
  }

  const cfg = await getSettings();
  const noreplyFrom = cfg["email.noreply_from"] || "noreply@leafyshop.eu";
  const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";

  const html = emailWrapper(`
    <h2 style="color:#1a4d1a;margin-top:0">Welcome to Leafy Management, ${escapeHtml(name)}!</h2>
    <p>Your account has been created. Here are your login details:</p>
    <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;font-size:14px">
      <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin:0 0 8px"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:13px">${escapeHtml(password)}</code></p>
      <p style="margin:0"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;color:#9a3412">
      ⚠️ You will be required to change your password on first login.
    </div>
    <p>
      <a href="${loginUrl}" style="display:inline-block;background:#15803d;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Log In →</a>
    </p>
  `, storeName);

  try {
    await resend.emails.send({
      from: `Leafy <${noreplyFrom}>`,
      to: email,
      subject: "Welcome to Leafy Management — Your Login Details",
      html,
    });
    console.log("[EMAIL] Welcome email sent to", email);
  } catch (error) {
    console.error("[EMAIL] Failed to send welcome email:", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function sendCreditNoteEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  creditNoteNumber: string,
  originalInvoiceNumber: string,
  totalAmount: number,
  orderId: number,
) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping credit note email to", customerEmail);
    return;
  }

  const cfg = await getSettings();
  const invoicesFrom = cfg["email.invoices_from"] || "invoices@leafyshop.eu";
  const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";

  const html = emailWrapper(`
    <h2 style="color:#1a4d1a;margin-top:0">Hi ${escapeHtml(customerName)},</h2>
    <p>A credit note has been issued for your order <strong>${escapeHtml(orderNumber)}</strong>.</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;margin:16px 0">
      <p style="margin:0 0 8px;font-weight:600;color:#dc2626">Credit Note: ${escapeHtml(creditNoteNumber)}</p>
      <p style="margin:0;font-size:14px;color:#666">Original Invoice: ${escapeHtml(originalInvoiceNumber)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#666">Amount: <strong>-$${(totalAmount / 100).toFixed(2)}</strong></p>
    </div>

    <p style="font-size:14px;color:#666">
      This credit note fully reverses the original invoice. If you have already paid, a refund will be processed.
    </p>

    <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px">
      <a href="${appUrl}/api/credit-notes/${orderId}" style="color:#15803d">View Credit Note</a>
    </div>

    <p style="color:#666;font-size:13px">If you have any questions, please contact us.</p>
  `, storeName, cfg["email.tpl.footer"]);

  try {
    await resend.emails.send({
      from: `Leafy <${invoicesFrom}>`,
      to: customerEmail,
      subject: `Credit Note ${creditNoteNumber} — Order ${orderNumber}`,
      html,
    });
    console.log("[EMAIL] Credit note email sent to", customerEmail);
  } catch (error) {
    console.error("[EMAIL] Failed to send credit note email:", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  password: string,
  loginUrl: string,
) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping reset email to", email);
    return;
  }

  const cfg = await getSettings();
  const noreplyFrom = cfg["email.noreply_from"] || "noreply@leafyshop.eu";
  const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";

  const html = emailWrapper(`
    <h2 style="color:#1a4d1a;margin-top:0">Password Reset</h2>
    <p>Hi ${escapeHtml(name)}, your password has been reset by an administrator.</p>
    <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;font-size:14px">
      <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin:0"><strong>New Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:13px">${escapeHtml(password)}</code></p>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;color:#9a3412">
      ⚠️ You will be required to change your password on next login.
    </div>
    <p>
      <a href="${loginUrl}" style="display:inline-block;background:#15803d;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Log In →</a>
    </p>
  `, storeName);

  try {
    await resend.emails.send({
      from: `Leafy <${noreplyFrom}>`,
      to: email,
      subject: "Leafy Management — Your Password Has Been Reset",
      html,
    });
    console.log("[EMAIL] Password reset email sent to", email);
  } catch (error) {
    console.error("[EMAIL] Failed to send reset email:", error instanceof Error ? error.message : "Unknown error");
  }
}
