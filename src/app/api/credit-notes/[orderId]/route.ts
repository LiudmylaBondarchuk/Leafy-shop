import { db } from "@/lib/db";
import { orders, orderItems, creditNotes } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { NextResponse, NextRequest } from "next/server";
import { getAdminFromCookie } from "@/lib/auth";
import { getCustomerFromCookie } from "@/lib/customer-auth";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    const customer = await getCustomerFromCookie();
    if (!admin && !customer) return apiError("Unauthorized", 401);

    const { orderId } = await params;

    const creditNote = await db.query.creditNotes.findFirst({
      where: eq(creditNotes.orderId, parseInt(orderId)),
    });

    if (!creditNote) return apiError("Credit note not found", 404);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(orderId)),
      with: { items: true },
    });

    if (!order) return apiError("Order not found", 404);

    // Customer can only view their own credit notes
    if (!admin && customer && customer.email !== order.customerEmail) {
      return apiError("Unauthorized", 401);
    }

    const cfg = await getSettings();
    const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";
    const storeAddress = cfg["store.address"] || "5 Leafy Lane, Warsaw, Poland";
    const invoicesEmail = cfg["email.invoices_from"] || "invoices@leafyshop.eu";

    const creditNoteDate = new Date(creditNote.createdAt).toLocaleDateString("en-US", { dateStyle: "long" });
    const originalInvoiceDate = new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "long" });

    const itemsHtml = (order.items as any[]).map((item: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.productName)}<br><small style="color:#666">${escapeHtml(item.variantDesc)}</small></td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatPrice(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626">-${formatPrice(item.totalPrice)}</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Credit Note ${creditNote.creditNoteNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; font-size: 14px; }
    .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
    @media print {
      .invoice { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
      <div>
        <div style="display:inline-flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;background:#15803d;border-radius:10px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:22px;font-weight:700;font-family:Georgia,serif">L</span>
          </div>
          <div>
            <div style="font-size:28px;font-weight:700;color:#15803d;line-height:1">Leafy</div>
            <div style="font-size:11px;color:#888;margin-top:2px;letter-spacing:0.5px">Premium Teas & Coffees</div>
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <h2 style="font-size:24px;color:#dc2626;margin-bottom:8px">CREDIT NOTE</h2>
        <p style="font-size:13px;color:#666">${escapeHtml(creditNote.creditNoteNumber)}</p>
        <p style="font-size:13px;color:#666">Date: ${creditNoteDate}</p>
        <p style="font-size:13px;color:#666">Order: ${escapeHtml(order.orderNumber)}</p>
      </div>
    </div>

    <!-- Reference to original invoice -->
    <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;margin-bottom:32px">
      <p style="font-size:13px;color:#dc2626;font-weight:600;margin-bottom:4px">This credit note corrects:</p>
      <p style="font-size:13px;color:#666">Original Invoice: <strong>${escapeHtml(creditNote.originalInvoiceNumber)}</strong></p>
      <p style="font-size:13px;color:#666">Original Invoice Date: ${originalInvoiceDate}</p>
      <p style="font-size:13px;color:#666;margin-top:4px">Reason: ${escapeHtml(creditNote.reason)}</p>
    </div>

    <!-- Seller & Buyer -->
    <div style="display:flex;gap:40px;margin-bottom:32px">
      <div style="flex:1">
        <h3 style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-bottom:8px">From</h3>
        <p style="font-weight:600">${escapeHtml(storeName)}</p>
        <p style="color:#666">${escapeHtml(storeAddress)}</p>
        <p style="color:#666;margin-top:4px">${escapeHtml(invoicesEmail)}</p>
      </div>
      <div style="flex:1">
        <h3 style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-bottom:8px">Bill To</h3>
        ${order.wantsInvoice && order.invoiceCompany ? `
          <p style="font-weight:600">${escapeHtml(order.invoiceCompany)}</p>
          <p style="color:#666">Tax ID: ${escapeHtml(order.invoiceNip || '')}</p>
          <p style="color:#666">${escapeHtml(order.invoiceAddress || '')}</p>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee">
            <p style="color:#666">${escapeHtml(order.customerFirstName)} ${escapeHtml(order.customerLastName)}</p>
            <p style="color:#666">${escapeHtml(order.customerEmail)}</p>
          </div>
        ` : `
          <p style="font-weight:600">${escapeHtml(order.customerFirstName)} ${escapeHtml(order.customerLastName)}</p>
          <p style="color:#666">${escapeHtml(order.shippingStreet)}</p>
          <p style="color:#666">${escapeHtml(order.shippingZip)} ${escapeHtml(order.shippingCity)}</p>
          <p style="color:#666;margin-top:4px">${escapeHtml(order.customerEmail)}</p>
        `}
      </div>
    </div>

    <!-- Items (negative amounts) -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#fef2f2">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #fecaca">Product</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;border-bottom:2px solid #fecaca">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;border-bottom:2px solid #fecaca">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;border-bottom:2px solid #fecaca">Credit Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals (negative) -->
    <div style="display:flex;justify-content:flex-end">
      <table style="width:280px">
        <tr>
          <td style="padding:6px 0;color:#666">Subtotal</td>
          <td style="padding:6px 0;text-align:right;color:#dc2626">-${formatPrice(creditNote.subtotal)}</td>
        </tr>
        ${creditNote.discountAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#15803d">Discount reversal</td>
          <td style="padding:6px 0;text-align:right;color:#15803d">+${formatPrice(creditNote.discountAmount)}</td>
        </tr>
        ` : ""}
        ${creditNote.vatAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#666">VAT (${creditNote.vatRate}%)</td>
          <td style="padding:6px 0;text-align:right;color:#dc2626">-${formatPrice(creditNote.vatAmount)}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding:6px 0;color:#666">Shipping</td>
          <td style="padding:6px 0;text-align:right;color:#dc2626">${creditNote.shippingCost === 0 ? "Free" : `-${formatPrice(creditNote.shippingCost)}`}</td>
        </tr>
        <tr style="border-top:2px solid #dc2626">
          <td style="padding:12px 0;font-weight:700;font-size:16px;color:#dc2626">Credit Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:700;font-size:16px;color:#dc2626">-${formatPrice(creditNote.total)}</td>
        </tr>
      </table>
    </div>

    <!-- Payment info -->
    <div style="margin-top:32px;padding:16px;background:#fef2f2;border-radius:8px;font-size:13px;color:#666">
      <p><strong>Payment method:</strong> ${order.paymentMethod === "cod" ? "Cash on Delivery" : "PayPal"}</p>
      <p><strong>Shipping method:</strong> ${order.shippingMethod === "courier" ? "Courier (DPD)" : order.shippingMethod === "inpost" ? "InPost Parcel Locker" : "In-store Pickup"}</p>
      <p style="margin-top:8px;color:#dc2626"><strong>This credit note fully reverses the original invoice ${escapeHtml(creditNote.originalInvoiceNumber)}.</strong></p>
    </div>

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#999">
      <p>${escapeHtml(storeName)} · ${escapeHtml(storeAddress)} · ${escapeHtml(invoicesEmail)}</p>
      <p style="margin-top:4px">This is a portfolio project. This credit note is for demonstration purposes only.</p>
    </div>

    <!-- Print button -->
    <div class="no-print" style="margin-top:24px;text-align:center">
      <button onclick="window.print()" style="background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">
        Print / Save as PDF
      </button>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("GET /api/credit-notes/[orderId] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to generate credit note", 500);
  }
}
