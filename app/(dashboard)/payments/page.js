import { createClient } from "@/lib/supabase/server";
import { PaymentsView } from "./payments-view";

export const metadata = {
  title: "Pagos",
};

export default async function PaymentsPage() {
  const supabase = await createClient();
  const [paymentsResult, paymentMethodsResult] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, receipt_id, payment_method_id, total_amount, commission, status, proof_bucket, proof_path, voucher_pdf_bucket, voucher_pdf_path, created_at, receipts(id, account_receipt_number, clients(name, last_name, phone_number), services(name)), payment_methods(name)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_methods")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  return (
    <PaymentsView
      initialPayments={paymentsResult.error ? [] : paymentsResult.data ?? []}
      initialPaymentMethods={paymentMethodsResult.error ? [] : paymentMethodsResult.data ?? []}
      fetchError={paymentsResult.error?.message ?? null}
    />
  );
}
