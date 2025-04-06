import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function Header({ toggleSidebar, isSidebarOpen }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between bg-background sticky top-0 z-30">
      <div className="flex items-center">
        <div className="mr-4 md:hidden">
          <button
            onClick={toggleSidebar}
            className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-9 w-9 rounded-lg mr-2 text-primary"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M7.5 12h9M12 7.5v9" />
              </svg>
              <h1 className="text-xl font-bold text-primary dark:text-primary">
                LinguaMaster
              </h1>
            </a>
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {user && (
          <div className="hidden md:flex items-center space-x-2 mr-2">
            <div className="px-3 py-1 bg-primary-light dark:bg-neutral-800 text-primary dark:text-primary rounded-full text-sm font-semibold">
              <span className="mr-1">🔥</span> {user.streak} day streak
            </div>

            <div className="px-3 py-1 bg-secondary-light dark:bg-neutral-800 text-secondary dark:text-secondary rounded-full text-sm font-semibold">
              <span className="mr-1">⭐</span> {user.xp} XP
            </div>
          </div>
        )}

        <ThemeToggle />

        {user && (
          <DropdownMenu
            open={isProfileDropdownOpen}
            onOpenChange={setIsProfileDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white dark:text-primary-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email || `@${user.username}`}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <a className="cursor-pointer w-full">Profile</a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/achievements">
                  <a className="cursor-pointer w-full">Achievements</a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
