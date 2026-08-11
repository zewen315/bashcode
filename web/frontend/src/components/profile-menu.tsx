"use client";

import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDemoUser, setDemoUser, clearDemoUser, initials, type DemoUser } from "@/lib/demo-user";

export function ProfileMenu() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    setUser(getDemoUser());
  }, []);

  function handleDemoSignIn() {
    const demo = { name: "Guest" };
    setDemoUser(demo);
    setUser(demo);
  }

  function handleSignOut() {
    clearDemoUser();
    setUser(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-8" aria-label="Account" />}
      >
        {user ? (
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <CircleUserRound className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {user ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Signed in as {user.name} (demo preview — not a real account)
            </DropdownMenuLabel>
            <DropdownMenuItem disabled>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Accounts aren&apos;t built yet
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleDemoSignIn}>
              Try demo sign-in (preview only)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
