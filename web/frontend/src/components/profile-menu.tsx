"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, signOut, initials, GITHUB_LOGIN_URL, GOOGLE_LOGIN_URL, type AuthUser } from "@/lib/auth";

export function ProfileMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  async function handleSignOut() {
    await signOut();
    setUser(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-8" aria-label="Account" />}
      >
        {user ? (
          <Avatar size="sm">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials(user.display_name)}
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
              Signed in as {user.display_name ?? "you"}
            </DropdownMenuLabel>
            <DropdownMenuLinkItem render={<Link href="/settings" />}>Settings</DropdownMenuLinkItem>
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLinkItem href={GITHUB_LOGIN_URL}>Sign in with GitHub</DropdownMenuLinkItem>
            <DropdownMenuLinkItem href={GOOGLE_LOGIN_URL}>Sign in with Google</DropdownMenuLinkItem>
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
