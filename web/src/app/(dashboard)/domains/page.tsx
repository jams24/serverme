"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Globe, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { api, type Domain } from "@/lib/api";

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState<{ name: string; target: string } | null>(null);

  async function load() {
    try {
      setDomains(await api.listDomains());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addDomain() {
    if (!newDomain.trim()) return;
    try {
      const data = await api.createDomain(newDomain);
      setInstructions({
        name: data.instructions.name,
        target: data.instructions.target,
      });
      setNewDomain("");
      load();
    } catch {}
  }

  async function verify(id: string) {
    try {
      await api.verifyDomain(id);
      load();
    } catch {}
  }

  async function remove(id: string) {
    try {
      await api.deleteDomain(id);
      load();
    } catch {}
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Custom Domains</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bring your own domain for your tunnels.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Add Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="api.example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
            />
            <Button onClick={addDomain} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {instructions && (
            <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm">
              <p className="font-medium text-blue-500 mb-2">
                Add this DNS record:
              </p>
              <div className="rounded-md bg-background p-3 font-mono text-xs">
                <span className="text-muted-foreground">Type:</span> CNAME
                <br />
                <span className="text-muted-foreground">Name:</span>{" "}
                {instructions.name}
                <br />
                <span className="text-muted-foreground">Target:</span>{" "}
                {instructions.target}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                After adding the record, click Verify on your domain below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Your Domains</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Globe className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No custom domains yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {d.domain}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        CNAME &rarr; {d.cname_target}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.verified ? (
                      <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <>
                        <Badge
                          variant="outline"
                          className="gap-1 text-yellow-500 border-yellow-500/20"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Pending
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verify(d.id)}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Verify
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(d.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
