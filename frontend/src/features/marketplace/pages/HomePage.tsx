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
      <section className="op-marketing-hero">
        <div
          aria-hidden="true"
          className="op-marketing-hero__glow"
        />
        <div className="op-marketing-hero__content mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="max-w-3xl">
            <AppLogo variant="expanded" className="mb-8" />
            <p className="op-marketing-eyebrow op-marketing-eyebrow--on-dark mb-4">
              OmniProperties by OmniTeckno
            </p>
            <h1 className="op-marketing-hero__title">
              Find a place to call home.
            </h1>
            <p className="op-marketing-hero__description mt-6">
              Explore current rental listings and send an application directly
              to the property team.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/listings"
                className="op-button op-button--primary op-button--lg"
              >
                Browse available listings
              </Link>
              <Link
                to="/login"
                className="op-button op-button--secondary op-button--lg op-button--on-dark"
              >
                Sign in
              </Link>
            </div>
          </div>
          <Card className="op-marketing-card p-7 text-hero-text sm:p-9">
            <p className="op-marketing-eyebrow op-marketing-eyebrow--on-dark">
              A clearer rental journey
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              Browse, learn, apply.
            </h2>
            <p className="op-marketing-copy--on-dark mt-3 leading-7">
              Review listing details, compare availability, and submit your
              rental application online.
            </p>
            <Link
              to="/listings"
              className="op-marketing-card__link mt-7 inline-flex items-center gap-2 font-semibold"
            >
              Explore listings
              <span aria-hidden="true">→</span>
            </Link>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="op-marketing-eyebrow">
            About OmniProperties
          </p>
          <h2 className="op-section-title mt-3 text-3xl text-text-primary">
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
