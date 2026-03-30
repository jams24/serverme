import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  Terminal,
  Globe,
  Shield,
  Zap,
  Eye,
  Lock,
  Repeat,
  Code,
  Gauge,
  Users,
  GitBranch,
  Cpu,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] rounded-full bg-blue-500/10 blur-[100px] sm:blur-[120px]" />
          <div className="absolute top-20 right-1/4 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-violet-500/10 blur-[100px] sm:blur-[120px]" />
        </div>

        <div className="mx-auto max-w-6xl px-5 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-40 lg:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white/5 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm text-muted-foreground backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Open Source &middot; MIT Licensed
            </div>

            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Your localhost,
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                everywhere.
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              ServerMe creates encrypted tunnels from the internet to your machine.
              Share local work, test webhooks, expose APIs — in one command.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button size="lg" className="gap-2 h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto" nativeButton={false} render={<Link href="/sign-up" />}>
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto" nativeButton={false} render={<Link href="/docs" />}>
                Documentation
              </Button>
            </div>

            {/* Trust bar */}
            <div className="mt-8 sm:mt-14 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                No credit card
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                10 free tunnels
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                Self-hostable
              </span>
            </div>
          </div>

          {/* Terminal */}
          <div className="mt-10 lg:absolute lg:right-6 lg:top-1/2 lg:-translate-y-1/2 lg:mt-0 lg:w-[480px] xl:right-12">
            <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl shadow-blue-500/5">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 sm:px-5 py-3">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#febc2e]" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#28c840]" />
                <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs text-zinc-600 font-mono">~</span>
              </div>
              <div className="p-4 sm:p-5 font-mono text-[11px] sm:text-[13px] leading-[1.8] overflow-x-auto">
                <div className="text-zinc-500">$ npm install -g serverme-cli</div>
                <div className="text-zinc-500 mt-2">$ serverme login</div>
                <div className="text-green-400 mt-1">&nbsp; ✓ Logged in successfully!</div>
                <div className="text-zinc-500 mt-3">$ serverme http 3000</div>
                <div className="mt-3 text-cyan-400">&nbsp; ServerMe</div>
                <div className="text-zinc-600 mt-2">&nbsp; Version&nbsp; <span className="text-zinc-400">1.0.0</span></div>
                <div className="text-zinc-600">&nbsp; Inspect&nbsp; <span className="text-blue-400">http://127.0.0.1:4040</span></div>
                <div className="mt-2 text-zinc-600">
                  &nbsp; HTTP&nbsp; <span className="text-green-400 font-semibold">https://myapp.serverme.site</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Install bar ──────────────────────────────────── */}
      <section className="border-y border-border/40 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-center gap-3 sm:gap-x-8 sm:gap-y-3 text-xs sm:text-sm text-muted-foreground">
            <InstallMethod icon={<Terminal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="npm" cmd="npm i -g serverme-cli" />
            <span className="hidden sm:block text-border">|</span>
            <InstallMethod icon={<Code className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="brew" cmd="brew install jams24/serverme/serverme" />
            <span className="hidden sm:block text-border">|</span>
            <InstallMethod icon={<Cpu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="go" cmd="go install ...serverme@latest" />
          </div>
        </div>
      </section>

      {/* ── What you can do ──────────────────────────────── */}
      <section className="py-16 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest">Use Cases</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              One CLI, endless possibilities
            </h2>
            <p className="mt-3 sm:mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
              Whether you&apos;re debugging webhooks, sharing a prototype, or exposing a database
              — ServerMe handles it with a single command.
            </p>
          </div>

          <div className="mt-8 sm:mt-14 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="group relative rounded-xl sm:rounded-2xl border border-border/50 bg-card/50 p-5 sm:p-6 transition-all hover:border-primary/20 hover:bg-accent/20"
              >
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                  <uc.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h3 className="mt-4 sm:mt-5 text-sm sm:text-base font-semibold">{uc.title}</h3>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
                <code className="mt-3 sm:mt-4 block rounded-lg bg-zinc-950 px-3 py-2 font-mono text-[10px] sm:text-xs text-zinc-400 overflow-x-auto">
                  {uc.cmd}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature deep-dive ────────────────────────────── */}
      <section className="border-t border-border/40 bg-white/[0.01] py-16 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest">Platform</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Built for developers who ship fast
            </h2>
          </div>

          <div className="mt-12 sm:mt-20 space-y-16 sm:space-y-24">
            <FeatureRow
              badge="Inspection"
              title="See every request. Replay any of them."
              desc="Every HTTP request flowing through your tunnel is captured with full headers, body, timing, and status. The built-in inspector at localhost:4040 gives you real-time visibility."
              visual={
                <div className="space-y-2">
                  {[
                    { method: "POST", path: "/api/webhook", status: 200, ms: 12, color: "text-green-400" },
                    { method: "GET", path: "/api/users?page=2", status: 200, ms: 8, color: "text-blue-400" },
                    { method: "POST", path: "/api/checkout", status: 422, ms: 45, color: "text-red-400" },
                    { method: "GET", path: "/health", status: 200, ms: 1, color: "text-blue-400" },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 rounded-lg bg-zinc-950/50 px-3 sm:px-4 py-2 sm:py-2.5 font-mono text-[10px] sm:text-xs">
                      <span className={`font-bold w-8 sm:w-10 ${r.color}`}>{r.method}</span>
                      <span className={`rounded px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold ${r.status < 400 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{r.status}</span>
                      <span className="flex-1 text-zinc-500 truncate">{r.path}</span>
                      <span className="text-zinc-600 hidden sm:inline">{r.ms}ms</span>
                    </div>
                  ))}
                </div>
              }
            />

            <FeatureRow
              badge="Protocols"
              title="HTTP. TCP. TLS. All encrypted."
              desc="Not just web traffic. Expose PostgreSQL, Redis, game servers — any TCP service gets a public port. TLS tunnels pass encrypted traffic through without decryption."
              reverse
              visual={
                <div className="space-y-2 sm:space-y-3">
                  {[
                    { proto: "HTTP", url: "https://myapp.serverme.site", local: "localhost:3000", color: "bg-blue-500" },
                    { proto: "TCP", url: "tcp://serverme.site:10000", local: "localhost:5432", color: "bg-green-500" },
                    { proto: "TLS", url: "tls://secure.serverme.site", local: "localhost:443", color: "bg-violet-500" },
                  ].map((t) => (
                    <div key={t.proto} className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4">
                      <span className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md sm:rounded-lg text-white text-[10px] sm:text-xs font-bold shrink-0 ${t.color}`}>
                        {t.proto}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] sm:text-xs text-foreground truncate">{t.url}</p>
                        <p className="font-mono text-[9px] sm:text-[11px] text-muted-foreground">{t.local}</p>
                      </div>
                      <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
                      </span>
                    </div>
                  ))}
                </div>
              }
            />

            <FeatureRow
              badge="Dashboard"
              title="Manage everything from the web."
              desc="A full dashboard to manage your tunnels, custom domains, API keys, and team. The traffic inspector shows requests in real-time. Analytics give you success rates and latency."
              visual={
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Requests", value: "12,847", sub: "last 24h" },
                    { label: "Success", value: "99.2%", sub: "2xx responses" },
                    { label: "Latency", value: "8ms", sub: "p50 duration" },
                    { label: "Bandwidth", value: "2.4 GB", sub: "in + out" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg sm:rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4">
                      <p className="text-[9px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className="mt-0.5 sm:mt-1 text-lg sm:text-xl font-bold">{s.value}</p>
                      <p className="text-[9px] sm:text-[11px] text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ── SDKs ─────────────────────────────────────────── */}
      <section className="border-t border-border/40 py-16 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest">SDKs</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              First-class SDKs for your stack
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">
              Manage tunnels programmatically. Stream live traffic. Replay requests.
            </p>
          </div>

          <div className="mt-8 sm:mt-14 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <SDKBlock
              lang="TypeScript"
              pkg="npm install @serverme/sdk"
              code={`import { ServerMe } from '@serverme/sdk';

const client = new ServerMe({
  authtoken: 'sm_live_...'
});

const tunnels = await client.tunnels.list();

for await (const req of client.inspect.subscribe(url)) {
  console.log(\`\${req.method} \${req.path} → \${req.statusCode}\`);
}`}
            />
            <SDKBlock
              lang="Python"
              pkg="pip install serverme"
              code={`from serverme import ServerMe

async with ServerMe(authtoken="sm_live_...") as client:
    tunnels = await client.tunnels.list()

    async for req in client.inspect.subscribe(url):
        print(f"{req.method} {req.path} → {req.status_code}")`}
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border/40 bg-white/[0.01] py-16 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest">Pricing</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Generous free tier. No surprises.
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">
              Most developers never need to pay. Upgrade when your team grows.
            </p>
          </div>

          <div className="mt-8 sm:mt-14 grid gap-4 sm:gap-8 max-w-3xl mx-auto grid-cols-1 lg:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl sm:rounded-2xl border p-6 sm:p-8 ${
                  plan.popular
                    ? "border-primary/40 bg-primary/[0.03] shadow-lg shadow-primary/5"
                    : "border-border/50 bg-card/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-6 sm:left-8 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="text-base sm:text-lg font-semibold">{plan.name}</h3>
                <div className="mt-3 sm:mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">/{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">{plan.desc}</p>

                <ul className="mt-6 sm:mt-8 space-y-2.5 sm:space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 sm:mt-8 w-full h-10 sm:h-11"
                  variant={plan.popular ? "default" : "outline"}
                  nativeButton={false}
                  render={<Link href="/sign-up" />}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="border-t border-border/40 py-16 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight">
            Start tunneling in
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              under 60 seconds.
            </span>
          </h2>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground">
            No credit card. No config files. Just one command.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-4 sm:gap-5">
            <Button size="lg" className="gap-2 h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base w-full sm:w-auto" nativeButton={false} render={<Link href="/sign-up" />}>
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="inline-flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border/50 bg-[#0a0a0a] px-4 sm:px-5 py-2.5 sm:py-3 font-mono text-xs sm:text-sm text-zinc-400 overflow-x-auto max-w-full">
              <Terminal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-600 shrink-0" />
              <span className="whitespace-nowrap">npm install -g serverme-cli</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────── */}
      <section id="features" className="border-t border-border/40 bg-white/[0.01] py-16 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Everything you&apos;d expect, and more
            </h2>
          </div>

          <div className="mt-8 sm:mt-14 grid gap-px grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-xl sm:rounded-2xl overflow-hidden border border-border/40">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-card/50 p-5 sm:p-7 transition-colors hover:bg-accent/20"
              >
                <f.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="mt-3 sm:mt-4 text-xs sm:text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Data ────────────────────────────────────────────────────

const useCases = [
  { icon: Globe, title: "Share local work", desc: "Show a client your site without deploying. Share a link and they see your localhost.", cmd: "$ serverme http 3000" },
  { icon: GitBranch, title: "Test webhooks", desc: "Receive Stripe, GitHub, or Slack webhooks on your machine. Inspect and replay them.", cmd: "$ serverme http 8080 --subdomain webhooks" },
  { icon: Shield, title: "Expose APIs", desc: "Let teammates or CI/CD hit your local API. Add basic auth for security.", cmd: '$ serverme http 4000 --auth "user:pass"' },
  { icon: Cpu, title: "Database tunnels", desc: "Expose PostgreSQL, MySQL, Redis — any TCP service gets a public port.", cmd: "$ serverme tcp 5432" },
  { icon: Lock, title: "TLS passthrough", desc: "Forward encrypted traffic without termination. Your TLS, your certs.", cmd: "$ serverme tls 443 --subdomain secure" },
  { icon: Code, title: "Multi-tunnel configs", desc: "Define all your tunnels in a YAML file. Start everything with one command.", cmd: "$ serverme start -c serverme.yml" },
];

const features = [
  { icon: Eye, title: "Request Inspection", desc: "View every request in real-time. Headers, body, timing — all captured at localhost:4040." },
  { icon: Repeat, title: "Replay Requests", desc: "Re-send any captured request with one click. Perfect for debugging webhooks." },
  { icon: Gauge, title: "Custom Domains", desc: "Bring your own domain with automatic Let's Encrypt TLS certificates." },
  { icon: Zap, title: "Blazing Fast", desc: "Written in Go with smux multiplexing. Sub-millisecond overhead, thousands of connections." },
  { icon: Users, title: "Team Management", desc: "Invite members, manage API keys, and control access with roles." },
  { icon: Shield, title: "Auth at Edge", desc: "Add basic auth, Google OAuth, or IP restrictions to your tunnels. No code changes." },
  { icon: Lock, title: "End-to-End Encryption", desc: "All traffic encrypted with TLS 1.3. Your data never touches our servers unencrypted." },
  { icon: Eye, title: "Analytics Dashboard", desc: "Success rates, latency percentiles, bandwidth usage, method breakdowns — all in real-time." },
  { icon: Code, title: "Self-Hostable", desc: "Deploy your own server with one command. Full control, your infrastructure." },
];

const plans = [
  {
    name: "Free", price: "$0", period: null,
    desc: "Everything you need to build and ship.",
    popular: true, cta: "Get Started Free",
    features: ["10 active tunnels", "HTTP, TCP & TLS tunnels", "Reserved subdomains", "Custom domains", "Request inspection & replay", "Analytics dashboard", "100 req/s rate limit", "Community support"],
  },
  {
    name: "Premium", price: "$10", period: "month",
    desc: "For teams and power users.",
    popular: false, cta: "Upgrade to Premium",
    features: ["10 active tunnels", "Wildcard domains", "OAuth at edge (Google, GitHub)", "500 req/s rate limit", "Team management & roles", "Webhook verification", "Traffic policies", "Priority support & SLA"],
  },
];

// ─── Components ─────────────────────────────────────────────

function InstallMethod({ icon, label, cmd }: { icon: React.ReactNode; label: string; cmd: string }) {
  return (
    <span className="flex items-center gap-1.5 sm:gap-2">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <code className="font-mono text-[10px] sm:text-xs text-foreground/70">{cmd}</code>
    </span>
  );
}

function FeatureRow({ badge, title, desc, visual, reverse }: { badge: string; title: string; desc: string; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <div className={`flex flex-col gap-8 sm:gap-12 lg:flex-row lg:items-center ${reverse ? "lg:flex-row-reverse" : ""}`}>
      <div className="flex-1 space-y-3 sm:space-y-4">
        <span className="inline-block rounded-full bg-primary/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-primary">
          {badge}
        </span>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h3>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">{desc}</p>
      </div>
      <div className="flex-1">
        <div className="rounded-xl sm:rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-6">
          {visual}
        </div>
      </div>
    </div>
  );
}

function SDKBlock({ lang, pkg, code }: { lang: string; pkg: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 sm:px-5 py-2.5 sm:py-3">
        <span className="text-xs sm:text-sm font-semibold text-zinc-300">{lang}</span>
        <code className="text-[9px] sm:text-[11px] text-zinc-600 hidden sm:block">{pkg}</code>
      </div>
      <pre className="p-4 sm:p-5 text-[11px] sm:text-[13px] leading-relaxed overflow-x-auto">
        <code className="text-zinc-400 font-mono">{code}</code>
      </pre>
    </div>
  );
}
