"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Key,
  Globe,
  Activity,
  Search,
  Trash2,
  Shield,
  Crown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface Stats {
  total_users: number;
  total_keys: number;
  total_domains: number;
  total_teams: number;
  total_requests: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  requests_today: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_admin: boolean;
  created_at: string;
  key_count: number;
  tunnel_requests: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  const headers = () => {
    const token = localStorage.getItem("sm_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  async function loadStats() {
    try {
      const res = await fetch(`${API}/api/v1/admin/stats`, { headers: headers() });
      if (res.status === 403) {
        setError("admin");
        return;
      }
      if (res.ok) setStats(await res.json());
    } catch {}
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (search) q.set("search", search);
      const res = await fetch(`${API}/api/v1/admin/users?${q}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  }

  async function updateUser(userId: string, updates: { plan?: string; is_admin?: boolean }) {
    await fetch(`${API}/api/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(updates),
    });
    loadUsers();
    loadStats();
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Delete ${email}? This cannot be undone.`)) return;
    await fetch(`${API}/api/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: headers(),
    });
    loadUsers();
    loadStats();
  }

  useEffect(() => {
    loadStats();
    loadUsers();
  }, [page]);

  if (error === "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-bold">Admin Access Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <p className="mt-1 text-sm text-muted-foreground">Platform overview and user management.</p>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<Users className="h-4 w-4" />} label="Total Users" value={stats.total_users} color="text-blue-500" />
          <StatCard icon={<UserPlus className="h-4 w-4" />} label="Today" value={stats.users_today} sub={`${stats.users_this_week} this week`} color="text-green-500" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="Requests" value={stats.total_requests} sub={`${stats.requests_today} today`} color="text-violet-500" />
          <StatCard icon={<Key className="h-4 w-4" />} label="API Keys" value={stats.total_keys} color="text-yellow-500" />
          <StatCard icon={<Globe className="h-4 w-4" />} label="Domains" value={stats.total_domains} sub={`${stats.total_teams} teams`} color="text-cyan-500" />
        </div>
      )}

      {/* User Management */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Users ({total})</CardTitle>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                className="pl-9 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); loadUsers(); } }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/50 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{u.name || u.email}</span>
                        {u.is_admin && (
                          <Badge className="gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            <Crown className="h-2.5 w-2.5" /> Admin
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">{u.plan}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{u.key_count} keys</span>
                        <span>{u.tunnel_requests.toLocaleString()} requests</span>
                        <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={u.plan}
                        onChange={(e) => updateUser(u.id, { plan: e.target.value })}
                        className="h-7 rounded border border-input bg-background px-2 text-[10px]"
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => updateUser(u.id, { is_admin: !u.is_admin })}
                        title={u.is_admin ? "Remove admin" : "Make admin"}
                      >
                        <Shield className={`h-3.5 w-3.5 ${u.is_admin ? "text-yellow-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => deleteUser(u.id, u.email)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className="mt-1 text-xl font-bold">{value.toLocaleString()}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
