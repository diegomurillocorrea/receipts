import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requirePageView } from "@/lib/auth/page-access";
import { PaymentsView } from "./payments-view";

export const metadata = {
  title: "Pagos",
};

function PaymentsViewFallback() {
  return (
    <div className="space-y-6 tablet:space-y-8" aria-busy="true" aria-label="Cargando pagos">
      <div className="h-10 w-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export default async function PaymentsPage() {
  await requirePageView("payments");
  const supabase = await createClient();
  const [paymentsResult, paymentMethodsResult] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, receipt_id, payment_method_id, total_amount, commission, status, proof_bucket, proof_path, created_at, receipts(id, account_receipt_number, clients(name, last_name, phone_number), services(id, name, link, image_bucket, image_path)), payment_methods(name)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_methods")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  return (
    <Suspense fallback={<PaymentsViewFallback />}>
      <PaymentsView
        initialPayments={paymentsResult.error ? [] : paymentsResult.data ?? []}
        initialPaymentMethods={paymentMethodsResult.error ? [] : paymentMethodsResult.data ?? []}
        fetchError={paymentsResult.error?.message ?? null}
      />
    </Suspense>
  );
}
