import "server-only";

const WHATSAPP_REQUEST_TIMEOUT_MS = 15_000;

export type PaymentConfirmationTemplateData = {
  clientName: string;
  serviceName: string;
  serviceNumber: string;
  formattedAmount: string;
  formattedCommission: string;
  formattedTotal: string;
};

type MetaMessage = {
  id?: string;
};

type MetaError = {
  code?: number;
  error_subcode?: number;
  type?: string;
  message?: string;
  error_data?: {
    details?: string;
  };
  fbtrace_id?: string;
};

type MetaResponse = {
  messages?: MetaMessage[];
  error?: MetaError;
};

export class WhatsAppConfigurationError extends Error {}

export class WhatsAppTimeoutError extends Error {}

export class WhatsAppUpstreamError extends Error {
  constructor(
    message: string,
    readonly upstreamStatus: number,
    readonly metaErrorCode?: number,
    readonly metaErrorSubcode?: number,
    readonly metaErrorMessage?: string,
    readonly metaErrorDetails?: string,
    readonly metaTraceId?: string,
  ) {
    super(message);
  }
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new WhatsAppConfigurationError(
      `Missing required WhatsApp configuration: ${name}.`,
    );
  }
  return value;
}

type WhatsAppConfiguration = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  templateName: string;
  templateLanguage: string;
};

export function getWhatsAppConfiguration(): WhatsAppConfiguration {
  return {
    accessToken: getRequiredEnvironmentVariable("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: getRequiredEnvironmentVariable("WHATSAPP_PHONE_NUMBER_ID"),
    graphApiVersion: getRequiredEnvironmentVariable("WHATSAPP_GRAPH_API_VERSION"),
    templateName: getRequiredEnvironmentVariable("WHATSAPP_TEMPLATE_NAME"),
    templateLanguage: getRequiredEnvironmentVariable("WHATSAPP_TEMPLATE_LANGUAGE"),
  };
}

function getMetaErrorCode(payload: MetaResponse): number | undefined {
  return typeof payload.error?.code === "number" ? payload.error.code : undefined;
}

function getMetaErrorSubcode(payload: MetaResponse): number | undefined {
  return typeof payload.error?.error_subcode === "number"
    ? payload.error.error_subcode
    : undefined;
}

function getMetaErrorText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function parseMetaResponse(response: Response): Promise<MetaResponse> {
  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return {};
    return payload as MetaResponse;
  } catch {
    return {};
  }
}

/**
 * Converts a stored/international number to WhatsApp's digits-only format.
 * Accepts +E.164, 00-prefix, or El Salvador digits already stored as 503XXXXXXXX.
 */
export function normalizeWhatsAppPhoneNumber(value: string | null | undefined): string | null {
  const input = value?.trim() ?? "";
  if (!input) return null;

  if (!/^(?:\+|00)?[0-9()\s.-]+$/.test(input)) return null;

  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (input.startsWith("00")) {
    normalized = digits.slice(2);
  } else if (input.startsWith("+")) {
    normalized = digits;
  } else if (/^503\d{8}$/.test(digits)) {
    // Stored app format: 503XXXXXXXX (no leading +).
    normalized = digits;
  } else {
    // Local numbers without country code are rejected so we never guess.
    return null;
  }

  // E.164 allows up to 15 digits and a country calling code cannot begin with 0.
  if (!/^[1-9]\d{6,14}$/.test(normalized)) return null;
  return normalized;
}

export async function sendPaymentConfirmationTemplate(
  to: string,
  templateData: PaymentConfirmationTemplateData,
): Promise<{ messageId: string }> {
  const {
    accessToken,
    phoneNumberId,
    graphApiVersion,
    templateName,
    templateLanguage,
  } = getWhatsAppConfiguration();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WHATSAPP_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(graphApiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLanguage },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: templateData.clientName },
                  { type: "text", text: templateData.serviceName },
                  { type: "text", text: templateData.serviceNumber },
                  { type: "text", text: templateData.formattedAmount },
                  { type: "text", text: templateData.formattedCommission },
                  { type: "text", text: templateData.formattedTotal },
                ],
              },
            ],
          },
        }),
      },
    );

    const payload = await parseMetaResponse(response);
    if (!response.ok) {
      throw new WhatsAppUpstreamError(
        "WhatsApp Cloud API rejected the request.",
        response.status,
        getMetaErrorCode(payload),
        getMetaErrorSubcode(payload),
        getMetaErrorText(payload.error?.message),
        getMetaErrorText(payload.error?.error_data?.details),
        getMetaErrorText(payload.error?.fbtrace_id),
      );
    }

    const messageId = payload.messages?.[0]?.id;
    if (!messageId) {
      throw new WhatsAppUpstreamError(
        "WhatsApp Cloud API returned no message ID.",
        response.status,
      );
    }

    return { messageId };
  } catch (error) {
    if (error instanceof WhatsAppUpstreamError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new WhatsAppTimeoutError("WhatsApp Cloud API request timed out.");
    }
    throw new WhatsAppUpstreamError("WhatsApp Cloud API request failed.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
