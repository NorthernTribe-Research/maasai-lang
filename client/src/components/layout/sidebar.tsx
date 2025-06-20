import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { UserLanguage, Language } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: userLanguages, isLoading: isLoadingLanguages } = useQuery<(UserLanguage & { language: Language })[]>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });

  const navItems = [
    { path: "/", label: "Dashboard", icon: "bx-dashboard" },
    { path: "/lessons", label: "Lessons", icon: "bx-book-open" },
    { path: "/ai-learning", label: "AI Learning", icon: "bx-brain" },
    { path: "/practice", label: "Practice", icon: "bx-cycling" },
    { path: "/achievements", label: "Achievements", icon: "bx-trophy" },
    { path: "/leaderboard", label: "Leaderboard", icon: "bx-bar-chart-alt-2" },
  ];

  const handleNavigation = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const navClasses = cn(
    "fixed inset-0 z-40 transform transition-transform duration-300 md:translate-x-0 md:relative md:inset-auto w-60 border-r border-neutral-200 dark:border-neutral-800 bg-background overflow-y-auto",
    {
      "translate-x-0": isOpen,
      "-translate-x-full": !isOpen,
      "md:hidden": !isOpen && window.innerWidth >= 768,
      "block": isOpen || window.innerWidth >= 768,
      "hidden": !isOpen && window.innerWidth < 768,
    }
  );

  return (
    <aside className={navClasses}>
      <nav className="py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a
                  className={cn(
                    "flex items-center px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
                    {
                      "text-primary dark:text-primary font-semibold bg-primary-light/30 dark:bg-neutral-800 border-r-4 border-primary":
                        location === item.path,
                      "text-neutral-600 dark:text-neutral-300":
                        location !== item.path,
                    }
                  )}
                  onClick={handleNavigation}
                >
                  <i className={`bx ${item.icon} text-xl mr-3`}></i>
                  {item.label}
                </a>
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="px-4 py-2 mt-4">
          <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
            My Languages
          </p>
          
          {isLoadingLanguages ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userLanguages && userLanguages.length > 0 ? (
            <ul className="space-y-2">
              {userLanguages.map((userLanguage) => (
                <li key={userLanguage.id}>
                  <Link href={`/lessons?languageId=${userLanguage.languageId}`}>
                    <a
                      className={cn(
                        "flex items-center p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        {
                          "bg-neutral-100 dark:bg-neutral-800":
                            location.includes(`?languageId=${userLanguage.languageId}`),
                        }
                      )}
                      onClick={handleNavigation}
                    >
                      <img
                        src={userLanguage.language.flag}
                        alt={`${userLanguage.language.name} flag`}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                      <div>
                        <p className="font-medium">{userLanguage.language.name}</p>
                        <div className="w-24 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1">
                          <div
                            className="h-1.5 bg-primary rounded-full"
                            style={{
                              width: `${userLanguage.progress}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-2 text-neutral-500 dark:text-neutral-400 text-sm">
              <p>No languages yet</p>
              <Link href="/lessons">
                <a
                  className="text-primary font-medium mt-1 block"
                  onClick={handleNavigation}
                >
                  Start learning
                </a>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
