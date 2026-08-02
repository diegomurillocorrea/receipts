import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions, hasPermission } from "@/lib/auth/permissions";
import {
  LEGACY_PAYMENT_STATUS_CANCELLED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_SENT,
  normalizePaymentStatus,
} from "@/app/(dashboard)/payments/constants";
import {
  getWhatsAppConfiguration,
  normalizeWhatsAppPhoneNumber,
  sendPaymentConfirmationTemplate,
  WhatsAppConfigurationError,
  WhatsAppTimeoutError,
  WhatsAppUpstreamError,
} from "@/lib/whatsapp/send-payment-confirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PaymentClient = {
  name: string | null;
  last_name: string | null;
  phone_number: string | null;
};

type PaymentService = {
  name: string | null;
};

type PaymentReceipt = {
  account_receipt_number: string | null;
  clients: PaymentClient | PaymentClient[] | null;
  services: PaymentService | PaymentService[] | null;
};

type PaymentRecord = {
  id: string;
  total_amount: number | string | null;
  commission: number | string | null;
  status: number | string | null;
  receipts: PaymentReceipt | PaymentReceipt[] | null;
  whatsapp_payment_notification_status: string | null;
  whatsapp_payment_notification_submitted_at: string | null;
};

type RouteContext = {
  params: Promise<{ paymentId: string }>;
};

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(error: string, status: number) {
  return response({ success: false, error }, status);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function requiredText(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  return text && text.length <= 512 ? text : null;
}

function formatMoneyForTemplate(
  value: number | string | null | undefined,
): string | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;

  // The approved Meta template itself contains the $ symbol.
  return amount.toFixed(2);
}

function formatTotalForTemplate(
  amount: number | string | null | undefined,
  commission: number | string | null | undefined,
): string | null {
  const parsedAmount = Number(amount);
  const parsedCommission = Number(commission);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) return null;
  if (!Number.isFinite(parsedCommission) || parsedCommission < 0) return null;

  return (parsedAmount + parsedCommission).toFixed(2);
}

async function markNotificationFailed(paymentId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("payments")
      .update({ whatsapp_payment_notification_status: "FAILED" })
      .eq("id", paymentId)
      .eq("whatsapp_payment_notification_status", "PENDING");

    if (error) {
      console.error("Unable to mark WhatsApp payment notification as failed.", {
        paymentId,
        code: error.code,
      });
    }
  } catch {
    console.error("Unable to mark WhatsApp payment notification as failed.", { paymentId });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { paymentId } = await context.params;
  if (!UUID_PATTERN.test(paymentId)) {
    return errorResponse("El identificador del pago no es válido.", 400);
  }

  const { userId, permissions } = await getCurrentUserPermissions();
  if (!userId) {
    return errorResponse("Debes iniciar sesión para enviar esta confirmación.", 401);
  }
  if (!hasPermission(permissions, "payments", "view")) {
    return errorResponse("No tienes permiso para acceder a este pago.", 403);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    console.error("Unable to create Supabase client for WhatsApp payment confirmation.", {
      paymentId,
      userId,
    });
    return errorResponse("No fue posible preparar el envío. Inténtalo más tarde.", 500);
  }

  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, total_amount, commission, status, whatsapp_payment_notification_status, whatsapp_payment_notification_submitted_at, receipts(id, account_receipt_number, clients(name, last_name, phone_number), services(name))",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    console.error("Unable to retrieve payment for WhatsApp confirmation.", {
      paymentId,
      userId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return errorResponse("No fue posible consultar el pago. Inténtalo más tarde.", 500);
  }

  const payment = data as PaymentRecord | null;
  if (!payment) {
    // This query uses the user's Supabase session, so RLS also enforces data scope.
    return errorResponse("No se encontró el pago solicitado.", 404);
  }

  const paymentStatus = normalizePaymentStatus(payment.status);
  const canConfirmByWhatsApp =
    paymentStatus === PAYMENT_STATUS_PAID ||
    paymentStatus === PAYMENT_STATUS_SENT;
  if (!canConfirmByWhatsApp) {
    return errorResponse(
      "Solo los pagos con estado Pagado o Enviado pueden confirmarse por WhatsApp.",
      422,
    );
  }

  const receipt = one(payment.receipts);
  const client = one(receipt?.clients);
  const service = one(receipt?.services);
  const clientName = requiredText(
    [client?.name, client?.last_name].filter(Boolean).join(" "),
  );
  const serviceName = requiredText(service?.name);
  const serviceNumber = requiredText(receipt?.account_receipt_number);
  const formattedAmount = formatMoneyForTemplate(payment.total_amount);
  const formattedCommission = formatMoneyForTemplate(payment.commission);
  const formattedTotal = formatTotalForTemplate(
    payment.total_amount,
    payment.commission,
  );
  const phoneNumber = normalizeWhatsAppPhoneNumber(client?.phone_number);

  if (!serviceNumber) {
    return errorResponse("El pago no tiene un número de servicio configurado.", 422);
  }
  if (!serviceName) {
    return errorResponse("El pago no tiene un nombre de servicio configurado.", 422);
  }
  if (payment.commission == null || !formattedCommission) {
    return errorResponse("El pago no tiene una comisión válida configurada.", 422);
  }
  if (!clientName || !formattedAmount || !formattedTotal) {
    return errorResponse("El pago no tiene la información necesaria para enviar la confirmación.", 422);
  }
  if (!phoneNumber) {
    return errorResponse(
      "El cliente necesita un número de WhatsApp válido (por ejemplo, 50370000000).",
      422,
    );
  }

  // Validate deployment configuration before the idempotency claim so a missing
  // environment variable never leaves a payment stuck in PENDING.
  try {
    getWhatsAppConfiguration();
  } catch (caughtError) {
    if (caughtError instanceof WhatsAppConfigurationError) {
      console.error("WhatsApp payment confirmation is not configured.", { paymentId, userId });
      return errorResponse("La confirmación por WhatsApp no está configurada.", 500);
    }
    console.error("Unable to validate WhatsApp payment confirmation configuration.", {
      paymentId,
      userId,
    });
    return errorResponse("No fue posible preparar el envío. Inténtalo más tarde.", 500);
  }

  // Claim before calling Meta. Staff may resend anytime for Pagado/Enviado.
  // Include legacy Cancelado (2) so any leftover rows still claim as Pagado.
  const { data: claim, error: claimError } = await supabase
    .from("payments")
    .update({
      whatsapp_payment_notification_status: "PENDING",
      whatsapp_payment_notification_message_id: null,
      whatsapp_payment_notification_submitted_at: null,
    })
    .eq("id", paymentId)
    .in("status", [
      PAYMENT_STATUS_PAID,
      PAYMENT_STATUS_SENT,
      LEGACY_PAYMENT_STATUS_CANCELLED,
    ])
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("Unable to claim WhatsApp payment notification.", {
      paymentId,
      userId,
      code: claimError.code,
    });
    return errorResponse("No fue posible preparar el envío. Inténtalo más tarde.", 500);
  }
  if (!claim) {
    return errorResponse(
      "No se pudo preparar el envío de WhatsApp para este pago. Recarga e inténtalo de nuevo.",
      409,
    );
  }

  try {
    const { messageId } = await sendPaymentConfirmationTemplate(phoneNumber, {
      clientName,
      serviceName,
      serviceNumber,
      formattedAmount,
      formattedCommission,
      formattedTotal,
    });

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: PAYMENT_STATUS_SENT,
        whatsapp_payment_notification_status: "SUBMITTED",
        whatsapp_payment_notification_message_id: messageId,
        whatsapp_payment_notification_submitted_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("whatsapp_payment_notification_status", "PENDING");

    if (updateError) {
      console.error("Meta accepted WhatsApp confirmation but it could not be recorded.", {
        paymentId,
        userId,
        code: updateError.code,
      });
      return errorResponse(
        "Meta aceptó el envío, pero no se pudo registrar su estado. Revisa el pago antes de volver a intentarlo.",
        500,
      );
    }

    return response(
      {
        success: true,
        message: "WhatsApp payment confirmation submitted successfully.",
        messageId,
      },
      200,
    );
  } catch (caughtError) {
    await markNotificationFailed(paymentId);

    if (caughtError instanceof WhatsAppConfigurationError) {
      console.error("WhatsApp payment confirmation is not configured.", { paymentId, userId });
      return errorResponse("La confirmación por WhatsApp no está configurada.", 500);
    }
    if (caughtError instanceof WhatsAppTimeoutError) {
      console.error("WhatsApp payment confirmation timed out.", { paymentId, userId });
      return errorResponse(
        "Meta no confirmó el envío a tiempo. Revisa el estado antes de volver a intentarlo.",
        504,
      );
    }
    if (caughtError instanceof WhatsAppUpstreamError) {
      console.error("WhatsApp Cloud API rejected payment confirmation.", {
        paymentId,
        userId,
        upstreamStatus: caughtError.upstreamStatus,
        metaErrorCode: caughtError.metaErrorCode,
        metaErrorSubcode: caughtError.metaErrorSubcode,
        metaErrorMessage: caughtError.metaErrorMessage,
        metaErrorDetails: caughtError.metaErrorDetails,
        metaTraceId: caughtError.metaTraceId,
      });
      return errorResponse(
        "Meta no pudo aceptar la confirmación. Verifica la plantilla aprobada y el número del cliente.",
        502,
      );
    }

    console.error("Unexpected WhatsApp payment confirmation error.", { paymentId, userId });
    return errorResponse("No fue posible enviar la confirmación por WhatsApp.", 500);
  }
}
