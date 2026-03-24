import { DuolingoHeader } from "./DuolingoHeader";
import { BottomNav } from "./BottomNav";

interface DuolingoLayoutProps {
  children: React.ReactNode;
}

export function DuolingoLayout({ children }: DuolingoLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DuolingoHeader />
      
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6 overflow-y-auto">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}
