import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { NextResponse, NextRequest } from "next/server";
import { getVatScenario, calculateInvoiceVat } from "@/constants/countries";
import { getAdminFromCookie } from "@/lib/auth";
import { getCustomerFromCookie } from "@/lib/customer-auth";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateInvoiceNumber(orderId: number, date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `INV/${year}/${month}/${String(orderId).padStart(4, "0")}`;
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

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(orderId)),
      with: { items: true },
    });

    if (!order) return apiError("Order not found", 404);

    // Customer can only view their own invoices
    if (!admin && customer && customer.email !== order.customerEmail) {
      return apiError("Unauthorized", 401);
    }

    if (!order.wantsInvoice) return apiError("No invoice requested for this order", 400);

    const cfg = await getSettings();
    const storeName = cfg["store.name"] || "Leafy Tea & Coffee Ltd.";
    const storeAddress = cfg["store.address"] || "5 Leafy Lane, Warsaw, Poland";
    const invoicesEmail = cfg["email.invoices_from"] || "invoices@leafyshop.eu";

    // Determine VAT scenario based on customer country and VAT ID
    const customerCountry = order.shippingCountry || "PL";
    const hasVatId = !!(order.invoiceNip && order.invoiceNip.trim());
    const vatScenario = getVatScenario(customerCountry, hasVatId);
    const grossForVat = Math.max(0, order.subtotal - order.discountAmount);
    const vatBreakdown = calculateInvoiceVat(grossForVat, vatScenario);

    const invoiceNumber = generateInvoiceNumber(order.id, order.createdAt);
    const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "long" });

    // For 0% VAT scenarios (reverse charge / export), show net prices on line items
    const showNetPrices = vatBreakdown.vatRate === 0;
    const itemsHtml = (order.items as any[]).map((item: any) => {
      const unitPrice = showNetPrices ? Math.round(item.unitPrice / 1.23) : item.unitPrice;
      const totalPrice = showNetPrices ? Math.round(item.totalPrice / 1.23) : item.totalPrice;
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.productName)}<br><small style="color:#666">${escapeHtml(item.variantDesc)}</small></td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatPrice(unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatPrice(totalPrice)}</td>
      </tr>
    `;
    }).join("");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
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
      </div>
      <div style="text-align:right">
        <h2 style="font-size:24px;color:#333;margin-bottom:8px">INVOICE</h2>
        <p style="font-size:13px;color:#666">${invoiceNumber}</p>
        <p style="font-size:13px;color:#666">Date: ${invoiceDate}</p>
        <p style="font-size:13px;color:#666">Order: ${order.orderNumber}</p>
      </div>
    </div>

    <!-- Seller & Buyer -->
    <div style="display:flex;gap:40px;margin-bottom:32px">
      <div style="flex:1">
        <h3 style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-bottom:8px">From</h3>
        <p style="font-weight:600">${storeName}</p>
        <p style="color:#666">${storeAddress}</p>
        <p style="color:#666;margin-top:4px">${invoicesEmail}</p>
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

    <!-- Items -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #e5e7eb">Product</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;border-bottom:2px solid #e5e7eb">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;border-bottom:2px solid #e5e7eb">Unit Price${showNetPrices ? " (net)" : ""}</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;border-bottom:2px solid #e5e7eb">Total${showNetPrices ? " (net)" : ""}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end">
      <table style="width:300px">
        ${vatBreakdown.vatRate > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#666">Subtotal (gross)</td>
          <td style="padding:6px 0;text-align:right">${formatPrice(order.subtotal)}</td>
        </tr>
        ${order.discountAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#15803d">Discount</td>
          <td style="padding:6px 0;text-align:right;color:#15803d">-${formatPrice(order.discountAmount)}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding:6px 0;color:#666">Net amount</td>
          <td style="padding:6px 0;text-align:right">${formatPrice(vatBreakdown.netAmount)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666">${vatBreakdown.vatLabel}</td>
          <td style="padding:6px 0;text-align:right">${formatPrice(vatBreakdown.vatAmount)}</td>
        </tr>
        ` : `
        <tr>
          <td style="padding:6px 0;color:#666">Subtotal (net)</td>
          <td style="padding:6px 0;text-align:right">${formatPrice(vatBreakdown.netAmount)}</td>
        </tr>
        ${order.discountAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#15803d">Discount</td>
          <td style="padding:6px 0;text-align:right;color:#15803d">-${formatPrice(Math.round(order.discountAmount / 1.23))}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding:6px 0;color:#666">${vatBreakdown.vatLabel}</td>
          <td style="padding:6px 0;text-align:right">${formatPrice(0)}</td>
        </tr>
        `}
        <tr>
          <td style="padding:6px 0;color:#666">Shipping</td>
          <td style="padding:6px 0;text-align:right">${order.shippingCost === 0 ? "Free" : formatPrice(order.shippingCost)}</td>
        </tr>
        <tr style="border-top:2px solid #1a1a1a">
          <td style="padding:12px 0;font-weight:700;font-size:16px">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:700;font-size:16px">${formatPrice(order.total)}</td>
        </tr>
      </table>
    </div>

    ${vatBreakdown.vatNote ? `
    <!-- VAT Note -->
    <div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e">
      <strong>Note:</strong> ${vatBreakdown.vatNote}
    </div>
    ` : ""}

    <!-- Payment info -->
    <div style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px;font-size:13px;color:#666">
      <p><strong>Payment method:</strong> ${order.paymentMethod === "cod" ? "Cash on Delivery" : "PayPal"}</p>
      <p><strong>Shipping method:</strong> ${order.shippingMethod === "courier" ? "Courier (DPD)" : order.shippingMethod === "inpost" ? "InPost Parcel Locker" : "In-store Pickup"}</p>
    </div>

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#999">
      <p>${storeName} · ${storeAddress} · ${invoicesEmail}</p>
      <p style="margin-top:4px">This is a portfolio project. This invoice is for demonstration purposes only.</p>
    </div>

    <!-- Print button -->
    <div class="no-print" style="margin-top:24px;text-align:center">
      <button onclick="window.print()" style="background:#15803d;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">
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
    console.error("GET /api/invoices/[orderId] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to generate invoice", 500);
  }
}
