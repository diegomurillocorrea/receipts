import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageView } from "@/lib/auth/page-access";
import { requirePermission } from "@/lib/auth/permissions";
import {
  PaymentRegisterView,
  PaymentRegisterViewSkeleton,
} from "./payment-register-view";
import {
  PaymentEditView,
  PaymentEditViewSkeleton,
} from "./payment-edit-view";

export async function generateMetadata({ params, searchParams }) {
  const { serviceId, billId } = await params;
  const resolvedSearchParams = await searchParams;
  const paymentId = (resolvedSearchParams?.paymentId ?? "").trim();
  const decodedBillId = decodeURIComponent(billId ?? "").trim();
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();

  const serviceName = service?.name?.trim();
  const titleParts = [
    paymentId ? "Editar pago" : "Registrar pago",
    decodedBillId || null,
    serviceName || null,
  ].filter(Boolean);

  return {
    title: titleParts.join(" · "),
  };
}

function PaymentNotFoundMessage({ title, description, href, linkLabel }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        aria-label={linkLabel}
      >
        {linkLabel}
      </Link>
    </div>
  );
}

async function PaymentEditPageContent({ serviceId, billId, paymentId }) {
  const auth = await requirePermission("payments", "edit");
  if (auth.error) {
    return (
      <PaymentNotFoundMessage
        title="No autorizado"
        description="No tienes permiso para editar pagos."
        href="/payments"
        linkLabel="Volver a pagos"
      />
    );
  }

  const decodedBillId = decodeURIComponent(billId ?? "").trim();
  if (!decodedBillId || !paymentId) notFound();

  const supabase = await createClient();

  const [paymentResult, methodsResult] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, receipt_id, payment_method_id, total_amount, commission, status, proof_bucket, proof_path, created_at, receipts(id, account_receipt_number, service_id, clients(name, last_name), services(id, name, image_bucket, image_path))"
      )
      .eq("id", paymentId)
      .maybeSingle(),
    supabase
      .from("payment_methods")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (paymentResult.error || !paymentResult.data) {
    return (
      <PaymentNotFoundMessage
        title="Pago no encontrado"
        description="No existe el pago que intentas editar."
        href="/payments"
        linkLabel="Volver a pagos"
      />
    );
  }

  const payment = paymentResult.data;
  const receiptRaw = payment.receipts;
  const receipt = Array.isArray(receiptRaw) ? receiptRaw[0] : receiptRaw;

  if (!receipt) {
    return (
      <PaymentNotFoundMessage
        title="Recibo no encontrado"
        description="El pago no tiene un recibo asociado válido."
        href="/payments"
        linkLabel="Volver a pagos"
      />
    );
  }

  const accountMatches =
    (receipt.account_receipt_number ?? "").trim() === decodedBillId;
  const serviceMatches = receipt.service_id === serviceId;

  if (!accountMatches || !serviceMatches) {
    return (
      <PaymentNotFoundMessage
        title="Pago no encontrado"
        description="Este pago no corresponde a la cuenta o servicio indicados."
        href="/payments"
        linkLabel="Volver a pagos"
      />
    );
  }

  const joinedService = Array.isArray(receipt.services)
    ? receipt.services[0]
    : receipt.services;

  if (!joinedService) {
    return (
      <PaymentNotFoundMessage
        title="Servicio no encontrado"
        description="No se pudo cargar el servicio de este pago."
        href="/payments"
        linkLabel="Volver a pagos"
      />
    );
  }

  return (
    <PaymentEditView
      payment={payment}
      receipt={receipt}
      service={joinedService}
      paymentMethods={methodsResult.error ? [] : methodsResult.data ?? []}
      backHref="/payments"
    />
  );
}

async function PaymentRegisterPageContent({ serviceId, billId }) {
  await requirePageView("payments");

  const decodedBillId = decodeURIComponent(billId ?? "").trim();
  if (!decodedBillId) notFound();

  const supabase = await createClient();

  const [serviceResult, receiptResult, methodsResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, image_bucket, image_path")
      .eq("id", serviceId)
      .maybeSingle(),
    supabase
      .from("receipts")
      .select(
        "id, account_receipt_number, service_id, clients(name, last_name), services(id, name, image_bucket, image_path)"
      )
      .eq("service_id", serviceId)
      .eq("account_receipt_number", decodedBillId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payment_methods")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (serviceResult.error || !serviceResult.data) notFound();

  if (receiptResult.error || !receiptResult.data) {
    return (
      <PaymentNotFoundMessage
        title="Cuenta no encontrada"
        description={
          <>
            No existe la cuenta{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {decodedBillId}
            </span>{" "}
            para este servicio.
          </>
        }
        href={`/${serviceId}`}
        linkLabel="Volver a buscar"
      />
    );
  }

  const receipt = receiptResult.data;
  const joinedService = Array.isArray(receipt.services)
    ? receipt.services[0]
    : receipt.services;
  const service = joinedService ?? serviceResult.data;

  return (
    <PaymentRegisterView
      receipt={receipt}
      service={service}
      paymentMethods={methodsResult.error ? [] : methodsResult.data ?? []}
      backHref={`/${serviceId}`}
    />
  );
}

async function PaymentBillPageContent({ serviceId, billId, paymentId }) {
  if (paymentId) {
    return (
      <PaymentEditPageContent
        serviceId={serviceId}
        billId={billId}
        paymentId={paymentId}
      />
    );
  }

  return (
    <PaymentRegisterPageContent serviceId={serviceId} billId={billId} />
  );
}

export default async function PaymentBillPage({ params, searchParams }) {
  const { serviceId, billId } = await params;
  const resolvedSearchParams = await searchParams;
  const paymentId = (resolvedSearchParams?.paymentId ?? "").toString().trim();

  return (
    <Suspense
      fallback={
        paymentId ? (
          <PaymentEditViewSkeleton />
        ) : (
          <PaymentRegisterViewSkeleton />
        )
      }
    >
      <PaymentBillPageContent
        serviceId={serviceId}
        billId={billId}
        paymentId={paymentId || null}
      />
    </Suspense>
  );
}
