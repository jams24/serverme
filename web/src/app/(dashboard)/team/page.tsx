"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Crown, Shield } from "lucide-react";

export default function TeamPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team members and roles.
          </p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current user */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  Y
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">You</p>
                <p className="text-xs text-muted-foreground">
                  you@example.com
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Crown className="h-3 w-3" />
              Owner
            </Badge>
          </div>

          <div className="mt-8 flex flex-col items-center py-8">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium">Invite your team</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs text-center">
              Add team members to share tunnels, domains, and manage
              infrastructure together.
            </p>
            <div className="mt-4 flex items-center gap-2 w-full max-w-sm">
              <Input placeholder="teammate@example.com" />
              <Button className="shrink-0 gap-1">
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="flex items-start gap-3 rounded-lg border border-border/60 p-4"
              >
                <role.icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const roles = [
  {
    name: "Owner",
    icon: Crown,
    description:
      "Full access. Can manage billing, team members, and all resources.",
  },
  {
    name: "Admin",
    icon: Shield,
    description:
      "Can manage tunnels, domains, API keys, and invite members.",
  },
  {
    name: "Member",
    icon: Users,
    description: "Can view tunnels and use shared API keys.",
  },
];
