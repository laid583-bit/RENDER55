import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const client = createClient();

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        setStatus("failed");
        return;
      }

      try {
        const response = await client.apiCall.invoke({
          url: "/api/v1/payment/verify_payment",
          method: "POST",
          data: { session_id: sessionId },
        });

        if (response?.data?.status === "paid" || response?.data?.payment_status === "paid") {
          setStatus("success");
          setPaymentInfo(response.data);
        } else {
          setStatus("failed");
          setPaymentInfo(response?.data);
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
        setStatus("failed");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-20">
        <Card className="bg-[#1F2937] border-[#374151] p-8 text-center">
          {status === "loading" && (
            <>
              <RefreshCw className="h-16 w-16 text-amber-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">جاري التحقق من الدفع...</h2>
              <p className="text-gray-400">يرجى الانتظار</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">تم الدفع بنجاح!</h2>
              <p className="text-gray-400 mb-6">تم إيداع المبلغ في حسابك بنجاح</p>
              <div className="flex gap-3 justify-center">
                <Link to="/deposit">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    العودة للإيداع
                  </Button>
                </Link>
                <Link to="/converter">
                  <Button
                    variant="outline"
                    className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                  >
                    تحويل العملات
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">فشل التحقق من الدفع</h2>
              <p className="text-gray-400 mb-6">
                يرجى المحاولة مرة أخرى أو التواصل مع الدعم
              </p>
              <Link to="/deposit">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  العودة للإيداع
                </Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}