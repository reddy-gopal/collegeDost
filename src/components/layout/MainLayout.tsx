import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DynamicSidebar } from "./DynamicSidebar";
import { TrendingSidebar } from "./TrendingSidebar";
import { useAuth } from "@/hooks/useAuth";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex relative">
        {/* Show DynamicSidebar if logged in, otherwise show Sidebar */}
        {user ? <DynamicSidebar /> : <Sidebar />}
        
        <main className="flex-1 min-w-0 w-full pb-16 lg:pb-0">{children}</main>
        
        <TrendingSidebar />
      </div>
    </div>
  );
};
