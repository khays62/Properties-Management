import { Link } from "react-router-dom";

import { Card } from "../../../components/ui/Card";
import { usePageMetadata } from "../../../hooks/usePageMetadata";
import { AppLogo } from "../../../layouts/AppLogo";

export function HomePage() {
  usePageMetadata(
    "OmniProperties | Find a place to call home",
    "Browse available rental listings and learn about OmniProperties.",
  );

  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="max-w-3xl">
            <AppLogo variant="expanded" className="mb-8" />
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
              OmniProperties by OmniTeckno
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find a place to call home.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Explore current rental listings and send an application directly
              to the property team.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/listings"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-omni-blue px-6 py-3 text-sm font-semibold text-white hover:bg-omni-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Browse available listings
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-500 px-6 py-3 text-sm font-semibold text-white hover:border-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Sign in
              </Link>
            </div>
          </div>
          <Card className="border border-white/10 bg-white/5 p-7 text-white shadow-2xl backdrop-blur-sm sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">
              A clearer rental journey
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              Browse, learn, apply.
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              Review listing details, compare availability, and submit your
              rental application online.
            </p>
            <Link
              to="/listings"
              className="mt-7 inline-flex items-center gap-2 font-semibold text-white underline decoration-sky-400 underline-offset-4 hover:text-sky-200"
            >
              Explore listings
              <span aria-hidden="true">→</span>
            </Link>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-omni-blue">
            About OmniProperties
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
            One connected experience for finding and managing a home.
          </h2>
          <p className="mt-4 leading-7 text-text-secondary">
            OmniProperties brings rental listings and property operations
            together. Visitors can explore published homes and apply; property
            teams manage applications, leases, and ongoing operations in the
            secure workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
