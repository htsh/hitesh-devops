import { Routes, Route, Link } from "react-router";

function Overview() {
  return <h2 className="text-xl font-semibold">Overview</h2>;
}

export function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight">Monitor</span>
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-100">
            Overview
          </Link>
        </div>
      </nav>
      <main className="px-6 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
        </Routes>
      </main>
    </div>
  );
}
