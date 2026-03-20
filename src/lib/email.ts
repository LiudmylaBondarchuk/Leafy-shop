import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

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

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a4d1a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">🌿 Leafy</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none">
        <h2 style="color:#1a4d1a;margin-top:0">Thank you for your order!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> has been received and is being processed.</p>

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
          <tr><td style="padding:4px 0">Shipping</td><td style="text-align:right">${data.shippingCost === 0 ? "Free" : `$${(data.shippingCost / 100).toFixed(2)}`}</td></tr>
          <tr style="font-weight:bold;font-size:16px;border-top:2px solid #e5e7eb">
            <td style="padding:8px 0">Total</td><td style="text-align:right">$${(data.total / 100).toFixed(2)}</td>
          </tr>
        </table>

        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;font-size:14px">
          <strong>Shipping to:</strong><br>
          ${data.shippingAddress}<br>
          <strong>Method:</strong> ${data.shippingMethod}
        </div>

        <p style="color:#666;font-size:13px">You can track your order status at any time on our website.</p>
      </div>
      <div style="padding:16px;text-align:center;font-size:12px;color:#999;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        Leafy — Premium Teas & Coffees | This is a portfolio project
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: `Leafy <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Order Confirmation — ${data.orderNumber}`,
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
  note?: string
) {
  if (!resend) {
    console.log("[EMAIL] Resend not configured — skipping status email to", customerEmail);
    return;
  }

  const statusLabels: Record<string, string> = {
    paid: "Payment Confirmed",
    processing: "Being Prepared",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    returned: "Return Processed",
  };

  const statusLabel = statusLabels[newStatus] || newStatus;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a4d1a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">🌿 Leafy</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#1a4d1a;margin-top:0">Order Update</h2>
        <p>Hi ${customerName},</p>
        <p>Your order <strong>${orderNumber}</strong> status has been updated to:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
          <span style="font-size:20px;font-weight:bold;color:#15803d">${statusLabel}</span>
        </div>
        ${note ? `<p style="color:#666;font-size:14px"><strong>Note:</strong> ${note}</p>` : ""}
        <p style="color:#666;font-size:13px">You can track your order at any time on our website.</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: `Leafy <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Order ${orderNumber} — ${statusLabel}`,
      html,
    });
    console.log("[EMAIL] Status update sent to", customerEmail);
  } catch (error) {
    console.error("[EMAIL] Failed to send status email:", error);
  }
}
