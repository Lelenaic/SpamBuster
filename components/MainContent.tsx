"use client";

import { usePathname } from "next/navigation";

interface MainContentProps {
  children: React.ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname();
  const isWizard = pathname === '/wizard';

  return (
    <main className={`flex-1 ${isWizard ? 'ml-0 p-0 overflow-hidden' : 'ml-64 p-6 overflow-auto'} bg-secondary`}>
      {children}
    </main>
  );
}
