"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, Plus, Play, Square, Trash2, ExternalLink, RefreshCw, Terminal, Globe,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface Project {
  id: string;
  name: string;
  subdomain: string;
  framework: string;
  repo_url: string;
  status: string;
  last_deploy_at: string | null;
  created_at: string;
}

interface DeployLog {
  message: string;
  level: string;
  created_at: string;
}

const statusColor: Record<string, string> = {
  running: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  stopped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  created: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const frameworks = [
  { value: "node", label: "Node.js" },
  { value: "nextjs", label: "Next.js" },
  { value: "python", label: "Python" },
  { value: "static", label: "Static Site" },
  { value: "docker", label: "Dockerfile" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSub, setNewSub] = useState("");
  const [newFramework, setNewFramework] = useState("node");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [configuring, setConfiguring] = useState<string | null>(null);

  const headers = () => {
    const token = localStorage.getItem("sm_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  async function load() {
    try {
      const res = await fetch(`${API}/api/v1/projects`, { headers: headers() });
      if (res.ok) setProjects(await res.json());
    } catch {}
    setLoading(false);
  }

  async function create() {
    if (!newName || !newSub) return;
    await fetch(`${API}/api/v1/projects`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ name: newName, subdomain: newSub.toLowerCase().replace(/[^a-z0-9-]/g, ""), framework: newFramework }),
    });
    setNewName(""); setNewSub(""); setShowCreate(false);
    load();
  }

  async function deploy(id: string) {
    await fetch(`${API}/api/v1/projects/${id}/deploy`, { method: "POST", headers: headers() });
    load();
    loadLogs(id);
  }

  async function stop(id: string) {
    await fetch(`${API}/api/v1/projects/${id}/stop`, { method: "POST", headers: headers() });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this project and its container?")) return;
    await fetch(`${API}/api/v1/projects/${id}`, { method: "DELETE", headers: headers() });
    setSelectedProject(null);
    load();
  }

  async function loadLogs(id: string) {
    const res = await fetch(`${API}/api/v1/projects/${id}/logs`, { headers: headers() });
    if (res.ok) setLogs(await res.json());
  }

  async function updateConfig(id: string) {
    await fetch(`${API}/api/v1/projects/${id}`, {
      method: "PUT", headers: headers(),
      body: JSON.stringify({ repo_url: repoUrl, branch: "main" }),
    });
    setConfiguring(null);
    load();
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedProject) return;
    loadLogs(selectedProject);
    const timer = setInterval(() => loadLogs(selectedProject), 5000);
    return () => clearInterval(timer);
  }, [selectedProject]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deploy and host your apps with a Git URL.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1"><Plus className="h-3.5 w-3.5" /> New Project</Button>
        </div>
      </div>

      {/* Create */}
      {showCreate && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Create Project</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Project name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="relative">
                <Input placeholder="subdomain" value={newSub} onChange={(e) => setNewSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="pr-28" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">.serverme.site</span>
              </div>
              <select value={newFramework} onChange={(e) => setNewFramework(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {frameworks.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} size="sm" className="gap-1"><Rocket className="h-3.5 w-3.5" /> Create</Button>
              <Button onClick={() => setShowCreate(false)} size="sm" variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project list */}
      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
      ) : projects.length === 0 && !showCreate ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center py-16">
            <Rocket className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create a project to deploy your first app.</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 gap-1"><Plus className="h-4 w-4" /> New Project</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className={`transition-colors ${selectedProject === p.id ? "border-foreground/20" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0" onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)} style={{ cursor: "pointer" }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor[p.status] || ""}`}>{p.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{p.framework}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">{p.subdomain}.serverme.site</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status !== "running" && p.status !== "building" && (
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => {
                        if (!p.repo_url) { setConfiguring(p.id); setRepoUrl(p.repo_url || ""); }
                        else deploy(p.id);
                      }}>
                        <Play className="h-3 w-3" /> Deploy
                      </Button>
                    )}
                    {p.status === "running" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" nativeButton={false} render={<a href={`https://${p.subdomain}.serverme.site`} target="_blank" rel="noopener" />}>
                          <ExternalLink className="h-3 w-3" /> Visit
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => stop(p.id)}>
                          <Square className="h-3 w-3" /> Stop
                        </Button>
                      </>
                    )}
                    {p.status === "building" && <Badge className="text-[10px] animate-pulse">Building...</Badge>}
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Config modal */}
                {configuring === p.id && (
                  <div className="mt-4 rounded-lg border border-border/50 p-4 space-y-3">
                    <p className="text-xs font-medium">Set Git repository URL to deploy:</p>
                    <Input placeholder="https://github.com/user/repo.git" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { updateConfig(p.id).then(() => deploy(p.id)); }} className="gap-1"><Rocket className="h-3.5 w-3.5" /> Save & Deploy</Button>
                      <Button size="sm" variant="outline" onClick={() => setConfiguring(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Logs */}
                {selectedProject === p.id && logs.length > 0 && (
                  <div className="mt-4 rounded-lg border border-border/40 bg-[#09090b] overflow-hidden max-h-64 overflow-y-auto">
                    <div className="border-b border-white/[0.04] px-3 py-1.5 text-[10px] text-zinc-600 font-mono flex items-center gap-2">
                      <Terminal className="h-3 w-3" /> Deploy Logs
                    </div>
                    <div className="p-2 font-mono text-[11px] space-y-0.5">
                      {logs.map((l, i) => (
                        <div key={i} className={`px-2 py-0.5 rounded ${l.level === "error" ? "text-red-400" : l.level === "build" ? "text-amber-400" : l.level === "deploy" ? "text-emerald-400" : "text-zinc-500"}`}>
                          <span className="text-zinc-700">{new Date(l.created_at).toLocaleTimeString()}</span> {l.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
