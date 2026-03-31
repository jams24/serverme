"use client";

import { createContext, useContext } from "react";
import { useTeam } from "@/hooks/use-team";

interface TeamContextType {
  teams: { id: string; name: string; role: string }[];
  activeTeam: { id: string; name: string; role: string } | null;
  activeTeamId: string | null;
  switchTeam: (teamId: string | null) => void;
  teamQuery: () => string;
  loading: boolean;
}

const TeamContext = createContext<TeamContextType>({
  teams: [],
  activeTeam: null,
  activeTeamId: null,
  switchTeam: () => {},
  teamQuery: () => "",
  loading: true,
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const team = useTeam();
  return <TeamContext.Provider value={team}>{children}</TeamContext.Provider>;
}

export function useTeamContext() {
  return useContext(TeamContext);
}
