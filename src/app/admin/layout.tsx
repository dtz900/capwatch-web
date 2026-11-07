import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminNav />
      <div className="admin-scroll">{children}</div>
    </>
  );
}
