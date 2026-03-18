import { createClient } from "@/lib/supabase/server";
import { PaymentMethodsView } from "./payment-methods-view";

export const metadata = {
  title: "Métodos de pago",
};

export default async function PaymentMethodsPage() {
  const supabase = await createClient();
  const { data: paymentMethods = [], error: paymentMethodsError } = await supabase
    .from("payment_methods")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <PaymentMethodsView
      initialPaymentMethods={paymentMethodsError ? [] : paymentMethods}
      fetchError={paymentMethodsError?.message ?? null}
    />
  );
}
