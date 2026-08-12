"use client";

import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, initials, providerLabel, GITHUB_LOGIN_URL, GOOGLE_LOGIN_URL } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export function ProfileMenu() {
  const { user, setUser } = useAuth();

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
      <DropdownMenuContent align="end" className="w-60">
        {user ? (
          <>
            <div className="flex items-center gap-2.5 px-1.5 py-1.5">
              <Avatar size="default">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials(user.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{user.display_name ?? "you"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  Signed in with {providerLabel(user.provider)}
                </span>
                <span className="truncate text-xs text-muted-foreground">#{user.public_id}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLinkItem render={<Link href="/profile" />}>Profile</DropdownMenuLinkItem>
              <DropdownMenuLinkItem render={<Link href="/settings" />}>Settings</DropdownMenuLinkItem>
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuGroup>
          </>
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
