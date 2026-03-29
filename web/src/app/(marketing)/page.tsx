import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Shield,
  Zap,
  Eye,
  Terminal,
  Lock,
  Repeat,
  Users,
  ArrowRight,
  Check,
  Code,
  Gauge,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_70%)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-[radial-gradient(ellipse,hsl(var(--primary)/0.08),transparent_60%)]" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center lg:pt-32 lg:pb-28">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Open Source &middot; MIT Licensed
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Expose localhost
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-violet-500 bg-clip-text text-transparent">
              to the world
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            ServerMe creates secure tunnels from the internet to your local
            machine. HTTP, TCP, TLS &mdash; with request inspection, replay,
            and zero config.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 px-8" nativeButton={false} render={<Link href="/sign-up" />}>
                Get Started Free
                <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 px-8" nativeButton={false} render={<Link href="https://github.com/serverme/serverme" />}>
                <Code className="h-4 w-4" />
                View on GitHub
            </Button>
          </div>

          {/* Terminal Preview */}
          <div className="mx-auto mt-16 max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-zinc-950 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-zinc-500 font-mono">
                  terminal
                </span>
              </div>
              <div className="p-6 font-mono text-sm leading-relaxed">
                <div className="text-zinc-500">$ serverme http 3000</div>
                <div className="mt-4 text-zinc-300">
                  ServerMe{" "}
                  <span className="text-zinc-600">
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                  (Ctrl+C to quit)
                </div>
                <div className="mt-3 text-zinc-400">
                  <span className="text-zinc-600">Version</span>
                  {"              "}
                  <span className="text-zinc-300">1.0.0</span>
                </div>
                <div className="text-zinc-400">
                  <span className="text-zinc-600">Web Inspector</span>
                  {"        "}
                  <span className="text-blue-400">http://127.0.0.1:4040</span>
                </div>
                <div className="mt-3 text-zinc-400">
                  <span className="text-zinc-600">Forwarding</span>
                  {"           "}
                  <span className="text-green-400">
                    https://a1b2c3d4.serverme.dev
                  </span>
                  <span className="text-zinc-600"> -&gt; </span>
                  <span className="text-zinc-300">localhost:3000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete tunneling platform, not just a port forwarder.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/30 hover:bg-accent/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="border-t border-border/40 bg-accent/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple by design
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One command. One line of code. That&apos;s it.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <CodeBlock
              title="CLI"
              lang="bash"
              code={`# HTTP tunnel
serverme http 3000

# TCP tunnel (databases, etc.)
serverme tcp 5432

# TLS passthrough
serverme tls 443 --subdomain myapp

# From config file
serverme start --config serverme.yml`}
            />
            <CodeBlock
              title="JavaScript SDK"
              lang="typescript"
              code={`import { ServerMe } from '@serverme/sdk';

const client = new ServerMe({
  authtoken: 'sm_live_...'
});

const tunnel = await client.connect({
  proto: 'http',
  addr: 3000
});

console.log(tunnel.url);
// https://a1b2c3d4.serverme.dev`}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Generous free tier. No credit card required. Ever.
            </p>
          </div>

          <div className="mt-16 grid gap-8 max-w-3xl mx-auto lg:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-8 ${
                  plan.popular
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-6">Most Popular</Badge>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">
                      /{plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={plan.popular ? "default" : "outline"}
                  nativeButton={false} render={<Link href="/sign-up" />}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-accent/20 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to expose your localhost?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get started in under 30 seconds. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 px-8" nativeButton={false} render={<Link href="/sign-up" />}>
                Start for Free
                <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 font-mono text-sm text-muted-foreground">
            <Terminal className="h-4 w-4" />
            go install github.com/serverme/serverme/cli/cmd/serverme@latest
          </div>
        </div>
      </section>
    </>
  );
}

// Data

const features = [
  {
    icon: Globe,
    title: "HTTP, TCP & TLS Tunnels",
    description:
      "Expose any local service. Web apps, APIs, databases, game servers — all through secure tunnels.",
  },
  {
    icon: Eye,
    title: "Request Inspection",
    description:
      "View every request flowing through your tunnel in real-time. Headers, bodies, timing — all captured.",
  },
  {
    icon: Repeat,
    title: "Replay Requests",
    description:
      "Replay any captured request with one click. Debug webhooks and API integrations effortlessly.",
  },
  {
    icon: Shield,
    title: "Built-in Auth",
    description:
      "Add basic auth, OAuth, or IP restrictions to your tunnels. No code changes needed.",
  },
  {
    icon: Zap,
    title: "Blazing Fast",
    description:
      "Written in Go with multiplexed connections. Sub-millisecond overhead, handles thousands of concurrent connections.",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description:
      "All traffic encrypted with TLS 1.3. Your data never touches our servers unencrypted.",
  },
  {
    icon: Terminal,
    title: "Developer-First CLI",
    description:
      "Powerful CLI with YAML config, auto-reconnect, and a local web inspector at localhost:4040.",
  },
  {
    icon: Gauge,
    title: "Custom Domains",
    description:
      "Bring your own domain or reserve a subdomain. Automatic TLS certificates via Let's Encrypt.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Invite team members, manage API keys, and control access with role-based permissions.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: null,
    description: "Everything you need to build and ship. No limits on what matters.",
    popular: true,
    cta: "Get Started Free",
    features: [
      "10 active tunnels",
      "HTTP, TCP & TLS tunnels",
      "Reserved subdomains",
      "Custom domains",
      "Request inspection & replay",
      "100 req/s rate limit",
      "IP restrictions",
      "Basic auth at edge",
      "Community support",
    ],
  },
  {
    name: "Premium",
    price: "$10",
    period: "month",
    description: "For teams and power users who need the full platform.",
    popular: false,
    cta: "Upgrade to Premium",
    features: [
      "10 active tunnels",
      "Wildcard domains",
      "OAuth at edge (Google, GitHub)",
      "500 req/s rate limit",
      "Team management & roles",
      "Webhook verification",
      "Traffic policies",
      "Priority support",
      "SLA guarantee",
    ],
  },
];

// Components

function CodeBlock({
  title,
  lang,
  code,
}: {
  title: string;
  lang: string;
  code: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-500">
          {lang}
        </Badge>
      </div>
      <pre className="p-5 text-sm leading-relaxed overflow-x-auto">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}
