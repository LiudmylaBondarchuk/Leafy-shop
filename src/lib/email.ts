import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const SHIPPING_LABELS: Record<string, string> = {
  courier: "Courier (DPD)",
  inpost: "InPost Parcel Locker",
  pickup: "In-store Pickup",
};

const PAYMENT_LABELS: Record<string, string> = {
  paypal: "PayPal",
  cod: "Cash on Delivery",
  blik: "BLIK",
  card: "Credit Card",
  transfer: "Bank Transfer",
};

function emailWrapper(content: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a4d1a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">🌿 Leafy</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none">
        ${content}
      </div>
      <div style="padding:16px;text-align:center;font-size:12px;color:#999;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        Leafy — Premium Teas & Coffees
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
  shippingCost: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  shippingAddress: string;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping order confirmation email to", data.customerEmail);
    return;
  }

  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.productName}<br><small style="color:#666">${item.variantDesc}</small></td>
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
    <h2 style="color:#1a4d1a;margin-top:0">Hi ${data.customerName}, thank you for your order!</h2>
    <p>Your order <strong>${data.orderNumber}</strong> has been ${isPaid ? "paid and confirmed" : "received"}.</p>

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
      <tr><td style="padding:4px 0">Shipping (${shippingLabel})</td><td style="text-align:right">${data.shippingCost === 0 ? "Free" : `$${(data.shippingCost / 100).toFixed(2)}`}</td></tr>
      <tr style="font-weight:bold;font-size:16px;border-top:2px solid #e5e7eb">
        <td style="padding:8px 0">Total</td><td style="text-align:right">$${(data.total / 100).toFixed(2)}</td>
      </tr>
    </table>

    <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;font-size:14px">
      <p style="margin:0 0 4px"><strong>Delivery:</strong></p>
      <p style="margin:0;color:#666">${shippingMessage}</p>
      <p style="margin:4px 0 0;color:#666">${data.shippingAddress}</p>
      <p style="margin:8px 0 0"><strong>Payment:</strong> ${paymentLabel}</p>
    </div>

    <p style="color:#666;font-size:13px">You can track your order status at any time on our website.</p>
  `);

  try {
    await resend.emails.send({
      from: `Leafy <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: isPaid
        ? `Payment Confirmed — Order ${data.orderNumber}`
        : `Order Confirmed — ${data.orderNumber}`,
      html,
    });
    console.log("[EMAIL] Order confirmation sent to", data.customerEmail);
  } catch (error) {
    console.error("[EMAIL] Failed to send order confirmation:", error);
  }
}

export async function sendOrderStatusEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  newStatus: string,
  shippingMethod?: string,
  note?: string
) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping status email to", customerEmail);
    return;
  }

  const shippingLabel = SHIPPING_LABELS[shippingMethod || "courier"] || shippingMethod;

  const statusConfig: Record<string, { subject: string; heading: string; message: string; color: string; bgColor: string }> = {
    paid: {
      subject: `Payment Confirmed — Order ${orderNumber}`,
      heading: "Payment Confirmed ✓",
      message: "Your payment has been received. We'll start preparing your order shortly.",
      color: "#15803d",
      bgColor: "#f0fdf4",
    },
    processing: {
      subject: `Order ${orderNumber} — Being Prepared`,
      heading: "Your Order is Being Prepared",
      message: "Our team is carefully packing your teas and coffees. We'll notify you once it's shipped.",
      color: "#a16207",
      bgColor: "#fefce8",
    },
    shipped: {
      subject: `Order ${orderNumber} — Shipped!`,
      heading: "Your Order Has Been Shipped! 📦",
      message: shippingMethod === "inpost"
        ? `Your package is on its way to your InPost Parcel Locker. You'll receive a code to pick it up.`
        : shippingMethod === "pickup"
          ? `Your order is ready for pickup at our store (5 Leafy Lane, Warsaw). Mon–Fri 10am–6pm.`
          : `Your package is on its way via ${shippingLabel}. It should arrive within 2–4 business days.`,
      color: "#7c3aed",
      bgColor: "#f5f3ff",
    },
    delivered: {
      subject: `Order ${orderNumber} — Delivered`,
      heading: "Your Order Has Been Delivered ✓",
      message: "We hope you enjoy your teas and coffees! If you have any questions, don't hesitate to contact us.",
      color: "#15803d",
      bgColor: "#f0fdf4",
    },
    cancelled: {
      subject: `Order ${orderNumber} — Cancelled`,
      heading: "Your Order Has Been Cancelled",
      message: "Your order has been cancelled and any payment will be refunded within 5–10 business days.",
      color: "#dc2626",
      bgColor: "#fef2f2",
    },
    returned: {
      subject: `Order ${orderNumber} — Return Processed`,
      heading: "Your Return Has Been Processed",
      message: "We've received your return. Your refund will be processed within 5–10 business days.",
      color: "#ea580c",
      bgColor: "#fff7ed",
    },
  };

  const config = statusConfig[newStatus];
  if (!config) return;

  const html = emailWrapper(`
    <h2 style="color:#1a4d1a;margin-top:0">Hi ${customerName},</h2>
    <p>Here's an update on your order <strong>${orderNumber}</strong>:</p>
    <div style="background:${config.bgColor};padding:16px;border-radius:8px;text-align:center;margin:16px 0">
      <span style="font-size:20px;font-weight:bold;color:${config.color}">${config.heading}</span>
      <p style="margin:8px 0 0;font-size:14px;color:#666">${config.message}</p>
    </div>
    ${note ? `<p style="color:#666;font-size:14px"><strong>Note:</strong> ${note}</p>` : ""}
    <p style="color:#666;font-size:13px">You can track your order at any time on our website.</p>
  `);

  try {
    await resend.emails.send({
      from: `Leafy <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: config.subject,
      html,
    });
    console.log("[EMAIL] Status update sent to", customerEmail);
  } catch (error) {
    console.error("[EMAIL] Failed to send status email:", error);
  }
}
