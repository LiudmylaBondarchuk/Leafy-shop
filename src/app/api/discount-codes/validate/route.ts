import { validateDiscountCode } from "@/lib/discount-engine";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cart_subtotal, category_ids } = body;

    if (!code || typeof code !== "string") {
      return apiError("Discount code is required", 400, "VALIDATION_ERROR");
    }

    const result = await validateDiscountCode(
      code,
      cart_subtotal || 0,
      category_ids || []
    );

    return apiSuccess(result);
  } catch (error) {
    console.error("POST /api/discount-codes/validate error:", error);
    return apiError("Failed to validate discount code", 500);
  }
}
