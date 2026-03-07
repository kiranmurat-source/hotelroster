import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import MobileNav from "./MobileNav";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        {children}
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
