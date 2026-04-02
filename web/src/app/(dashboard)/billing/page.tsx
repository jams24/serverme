"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, ExternalLink, Loader2, Zap } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface BillingStatus {
  active_subscription: Subscription | null;
  history: Subscription[];
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const headers = () => {
    const token = localStorage.getItem("sm_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  async function loadStatus() {
    try {
      const res = await fetch(`${API}/api/v1/billing/status`, { headers: headers() });
      if (res.ok) setStatus(await res.json());
    } catch {}
    setLoading(false);
  }

  async function checkout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/billing/checkout`, {
        method: "POST",
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        // Open InventPay invoice page
        window.open(data.invoice_url, "_blank");
        // Start polling for payment
        pollPayment(data.payment_id);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create checkout");
      }
    } catch {}
    setCheckoutLoading(false);
  }

  async function pollPayment(paymentId: string) {
    const maxAttempts = 60; // 10 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 10000)); // 10s intervals
      try {
        const res = await fetch(`${API}/api/v1/billing/check?payment_id=${paymentId}`, {
          headers: headers(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "COMPLETED") {
            loadStatus();
            return;
          }
        }
      } catch {}
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const activeSub = status?.active_subscription;
  const isPremium = activeSub && activeSub.status === "active";
  const daysLeft = activeSub?.period_end
    ? Math.max(0, Math.ceil((new Date(activeSub.period_end).getTime() - Date.now()) / 86400000))
    : 0;

  const freeFeatures = [
    "10 active tunnels",
    "HTTP, TCP & TLS tunnels",
    "Reserved subdomains",
    "Custom domains",
    "Request inspection & replay",
    "Analytics dashboard",
    "100 req/s rate limit",
  ];

  const premiumFeatures = [
    "Everything in Free, plus:",
    "Wildcard domains",
    "OAuth at edge (Google, GitHub)",
    "500 req/s rate limit",
    "Team management & roles",
    "Webhook verification",
    "Traffic policies",
    "Priority support & SLA",
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your subscription and payment history.
      </p>

      {/* Current Plan */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Badge className="gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="outline">Free</Badge>
                )}
              </div>
              {isPremium ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Your Premium subscription is active. {daysLeft} days remaining.
                  {activeSub?.period_end && (
                    <span className="block mt-0.5">
                      Expires {new Date(activeSub.period_end).toLocaleDateString()}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  You&apos;re on the Free plan. Upgrade to Premium for advanced features.
                </p>
              )}
            </div>
            {!isPremium && (
              <Button
                onClick={checkout}
                disabled={checkoutLoading}
                className="gap-2 shrink-0"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Upgrade to Premium — $10/mo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className={!isPremium ? "border-primary/30" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Free
              {!isPremium && <Badge variant="outline" className="text-[10px]">Current</Badge>}
            </CardTitle>
            <p className="text-2xl font-bold">$0</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={isPremium ? "border-yellow-500/30" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-yellow-500" />
                Premium
              </span>
              {isPremium && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]">Current</Badge>}
            </CardTitle>
            <p className="text-2xl font-bold">$10<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            {!isPremium && (
              <Button onClick={checkout} disabled={checkoutLoading} className="mt-6 w-full gap-2">
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Pay with Crypto
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-xs font-bold">
              ₿
            </div>
            <div>
              <p className="text-sm font-medium">Cryptocurrency via InventPay</p>
              <p className="text-xs text-muted-foreground">
                Pay with BTC, ETH, USDT, SOL, LTC and more. Powered by{" "}
                <a href="https://inventpay.io" target="_blank" rel="noopener" className="text-primary hover:underline">
                  InventPay <ExternalLink className="inline h-2.5 w-2.5" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {status?.history && status.history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.history.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                  <div>
                    <span className="font-medium capitalize">{s.plan}</span>
                    <span className="ml-2 text-muted-foreground">
                      ${s.amount} {s.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        s.status === "active" ? "text-green-500 border-green-500/20" :
                        s.status === "pending" ? "text-yellow-500 border-yellow-500/20" :
                        "text-muted-foreground"
                      }`}
                    >
                      {s.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
