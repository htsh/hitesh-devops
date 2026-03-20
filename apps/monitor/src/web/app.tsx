import { Routes, Route, Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { OverviewPage } from "@/pages/overview";
import { ServicesPage } from "@/pages/services";
import { TargetsPage } from "@/pages/targets";
import { OutagesPage } from "@/pages/outages";
import { ServiceDetailPage } from "@/pages/service-detail";
import { TargetDetailPage } from "@/pages/target-detail";
import { TargetFormPage } from "@/pages/target-form";

const navLinks = [
  { to: "/", label: "Overview" },
  { to: "/services", label: "Services" },
  { to: "/targets", label: "Targets" },
  { to: "/outages", label: "Outages" },
];

export function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold tracking-tight">Monitor</Link>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm transition-colors hover:text-zinc-100",
                location.pathname === link.to ? "text-zinc-100" : "text-zinc-400"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:key" element={<ServiceDetailPage />} />
          <Route path="/targets" element={<TargetsPage />} />
          <Route path="/targets/new" element={<TargetFormPage />} />
          <Route path="/targets/:id" element={<TargetDetailPage />} />
          <Route path="/targets/:id/edit" element={<TargetFormPage />} />
          <Route path="/outages" element={<OutagesPage />} />
        </Routes>
      </main>
    </div>
  );
}
