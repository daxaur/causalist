import Link from "next/link";
import { ArrowLeft, GithubLogo } from "@phosphor-icons/react/dist/ssr";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <span className="text-sm font-semibold tracking-tight">dashboard</span>
        <div className="w-16" />
      </nav>

      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-8 py-32 text-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <GithubLogo size={20} weight="duotone" className="text-neutral-900" />
        </div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Connect GitHub to see your repos
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-neutral-500">
          Sign in with GitHub and causalist will list every repository you can
          access. Pick one to map it into a 3D graph.
        </p>
        <div className="mt-8 font-mono text-xs text-neutral-400">
          dashboard — coming day 2
        </div>
      </div>
    </main>
  );
}
