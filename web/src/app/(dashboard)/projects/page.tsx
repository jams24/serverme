"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, Plus, Play, Square, Trash2, ExternalLink, RefreshCw,
  Terminal, Globe, GitBranch, Search, Check, Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface Project {
  id: string; name: string; subdomain: string; framework: string;
  repo_url: string; github_repo: string; status: string;
  last_deploy_at: string | null; created_at: string;
}
interface DeployLog {
  message: string; level: string; created_at: string;
}
interface GitHubRepo {
  id: number; name: string; full_name: string; private: boolean;
  description: string; language: string; default_branch: string;
  html_url: string; updated_at: string;
}

const statusColor: Record<string, string> = {
  running: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  stopped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  created: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const langColor: Record<string, string> = {
  JavaScript: "bg-yellow-400", TypeScript: "bg-blue-400", Python: "bg-green-400",
  Go: "bg-cyan-400", Rust: "bg-orange-400", Java: "bg-red-400",
  Ruby: "bg-red-500", PHP: "bg-violet-400", HTML: "bg-orange-500",
};

function ProjectsContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [ghConnected, setGhConnected] = useState(false);
  const [ghUsername, setGhUsername] = useState("");
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [deploying, setDeploying] = useState<string | null>(null);

  const headers = () => {
    const token = localStorage.getItem("sm_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  // Handle GitHub OAuth callback
  useEffect(() => {
    const ghToken = searchParams.get("github_token");
    const ghUser = searchParams.get("github_user");
    if (ghToken && ghUser) {
      fetch(`${API}/api/v1/github/connect`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ access_token: ghToken, github_username: ghUser }),
      }).then(() => {
        setGhConnected(true);
        setGhUsername(ghUser);
        window.history.replaceState({}, "", "/projects");
      });
    }
  }, [searchParams]);

  async function loadGHStatus() {
    try {
      const res = await fetch(`${API}/api/v1/github/status`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setGhConnected(data.connected);
        if (data.username) setGhUsername(data.username);
      }
    } catch {}
  }

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API}/api/v1/github/repos`, { headers: headers() });
      if (res.ok) setGhRepos(await res.json());
    } catch {}
    setLoadingRepos(false);
  }

  async function load() {
    try {
      const res = await fetch(`${API}/api/v1/projects`, { headers: headers() });
      if (res.ok) setProjects(await res.json());
    } catch {}
    setLoading(false);
  }

  async function createFromRepo(repo: GitHubRepo) {
    const subdomain = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const framework = detectFramework(repo.language);

    const res = await fetch(`${API}/api/v1/projects`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ name: repo.name, subdomain, framework }),
    });

    if (res.ok) {
      const project = await res.json();
      // Link GitHub repo
      await fetch(`${API}/api/v1/projects/${project.id}`, {
        method: "PUT", headers: headers(),
        body: JSON.stringify({ repo_url: repo.html_url + ".git", branch: repo.default_branch }),
      });
      setShowRepoPicker(false);
      load();
    }
  }

  async function deploy(id: string) {
    setDeploying(id);
    await fetch(`${API}/api/v1/projects/${id}/deploy`, { method: "POST", headers: headers() });
    load();
    loadLogs(id);
    setTimeout(() => setDeploying(null), 3000);
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

  async function disconnectGH() {
    await fetch(`${API}/api/v1/github`, { method: "DELETE", headers: headers() });
    setGhConnected(false); setGhUsername(""); setGhRepos([]);
  }

  useEffect(() => { load(); loadGHStatus(); }, []);
  useEffect(() => {
    if (!selectedProject) return;
    loadLogs(selectedProject);
    const t = setInterval(() => loadLogs(selectedProject), 5000);
    return () => clearInterval(t);
  }, [selectedProject]);

  const filteredRepos = ghRepos.filter((r) =>
    !repoSearch || r.name.toLowerCase().includes(repoSearch.toLowerCase()) || r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deploy apps from your GitHub repos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
          {ghConnected ? (
            <Button size="sm" onClick={() => { setShowRepoPicker(true); loadRepos(); }} className="gap-1"><Plus className="h-3.5 w-3.5" /> Import Repo</Button>
          ) : (
            <Button size="sm" nativeButton={false} render={<a href={`${API}/api/v1/github/connect`} />} className="gap-1">
              <GitBranch className="h-3.5 w-3.5" /> Connect GitHub
            </Button>
          )}
        </div>
      </div>

      {/* GitHub status */}
      {ghConnected && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border/40 bg-card/30 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Connected to GitHub as</span>
            <span className="font-medium">@{ghUsername}</span>
            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20"><Check className="h-2.5 w-2.5 mr-0.5" /> Connected</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={disconnectGH} className="text-xs text-muted-foreground">Disconnect</Button>
        </div>
      )}

      {/* Repo picker modal */}
      {showRepoPicker && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Import a Repository</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowRepoPicker(false)}>Cancel</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search repos..." className="pl-9 h-9 text-sm" value={repoSearch} onChange={(e) => setRepoSearch(e.target.value)} />
            </div>

            {loadingRepos ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredRepos.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between rounded-lg border border-border/30 p-3 hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {repo.language && (
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${langColor[repo.language] || "bg-gray-400"}`} />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{repo.name}</span>
                          {repo.private && <Badge variant="outline" className="text-[9px]">private</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{repo.description || repo.full_name}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0 ml-2" onClick={() => createFromRepo(repo)}>
                      <Rocket className="h-3 w-3" /> Import
                    </Button>
                  </div>
                ))}
                {filteredRepos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No repos found</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Projects list */}
      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
      ) : projects.length === 0 && !showRepoPicker ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center py-16">
            <Rocket className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              {ghConnected ? "Import a repo from GitHub to deploy your first app." : "Connect your GitHub account to import and deploy repos."}
            </p>
            {ghConnected ? (
              <Button onClick={() => { setShowRepoPicker(true); loadRepos(); }} className="mt-4 gap-1"><Plus className="h-4 w-4" /> Import Repo</Button>
            ) : (
              <Button nativeButton={false} render={<a href={`${API}/api/v1/github/connect`} />} className="mt-4 gap-1">
                <GitBranch className="h-4 w-4" /> Connect GitHub
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className={`transition-colors ${selectedProject === p.id ? "border-foreground/20" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor[p.status] || ""}`}>{p.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{p.framework}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">{p.subdomain}.serverme.site</span>
                        {p.github_repo && (
                          <>
                            <GitBranch className="h-3 w-3 text-muted-foreground ml-1" />
                            <span className="text-xs text-muted-foreground">{p.github_repo}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status !== "running" && p.status !== "building" && (
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => deploy(p.id)} disabled={deploying === p.id}>
                        {deploying === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Deploy
                      </Button>
                    )}
                    {p.status === "running" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" nativeButton={false} render={<a href={`https://${p.subdomain}.serverme.site`} target="_blank" rel="noopener" />}>
                          <ExternalLink className="h-3 w-3" /> Visit
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => deploy(p.id)} disabled={deploying === p.id}>
                          {deploying === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Redeploy
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

function detectFramework(language: string | null): string {
  switch (language) {
    case "TypeScript": case "JavaScript": return "node";
    case "Python": return "python";
    case "Go": return "docker";
    case "HTML": case "CSS": return "static";
    default: return "node";
  }
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground p-8">Loading...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
