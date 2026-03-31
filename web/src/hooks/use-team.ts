"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
const STORAGE_KEY = "sm_team_id";

interface Team {
  id: string;
  name: string;
  role: string;
}

export function useTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = useCallback(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("sm_token") : null;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/v1/teams`, { headers: headers() });
        if (res.ok) {
          const data = await res.json();
          setTeams(data);

          // Restore saved team
          const saved =
            typeof window !== "undefined"
              ? localStorage.getItem(STORAGE_KEY)
              : null;
          if (saved && data.some((t: Team) => t.id === saved)) {
            setActiveTeamId(saved);
          }
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [headers]);

  function switchTeam(teamId: string | null) {
    setActiveTeamId(teamId);
    if (teamId) {
      localStorage.setItem(STORAGE_KEY, teamId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Build query string for API calls
  function teamQuery(): string {
    return activeTeamId ? `?team_id=${activeTeamId}` : "";
  }

  const activeTeam = teams.find((t) => t.id === activeTeamId) || null;

  return { teams, activeTeam, activeTeamId, switchTeam, teamQuery, loading };
}
