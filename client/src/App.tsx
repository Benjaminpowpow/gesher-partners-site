import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { trackPageView } from "./lib/analytics";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Valuation from "./pages/Valuation";
import ValuationLegacy from "./pages/ValuationLegacy";
import { lazy, Suspense } from "react";
import ExitBrief from "./pages/ExitBrief";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import TestRender from "./pages/TestRender";

// Loaded only in dev; the import is dropped from the production build.
const ValuationRtlPreview = import.meta.env.DEV
  ? lazy(() => import("./pages/ValuationRtlPreview"))
  : () => null;

// Every page starts at the very top (Ben, Oct 2: on a phone, the home page's
// menu took him to /valuation halfway down). The browser keeps the old scroll
// on a client-side hop and puts it back on the back button, so both are
// turned off here. A link to a section ("/#how") is left to the page, which
// jumps to it itself.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function Router() {
  // Meta needs a PageView on each client-side route change. GA4 counts these
  // itself. See lib/analytics.ts.
  const [location] = useLocation();
  useEffect(() => {
    trackPageView(location);
    if (!window.location.hash) {
      // At once: the site's base CSS makes scrolling smooth.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location]);

  return (
    <Switch>
      {/* Two languages, two URLs (decided 2026-09-16). English at the root,
          Hebrew under /he/. The server sends each its own <head>
          (server/_core/vite.ts) and 301s the old /en/ to the root; the
          Redirect below only covers a client-side hop to the old URL. */}
      <Route path="/" component={() => <Home lang="en" />} />
      <Route path="/he" component={() => <Home lang="he" />} />
      <Route path="/he/" component={() => <Home lang="he" />} />
      <Route path="/en">
        <Redirect to="/" replace />
      </Route>
      <Route path="/en/">
        <Redirect to="/" replace />
      </Route>
      {/* The valuation tool, same two-URL model as the home page. English
          runs the valuation estimate (Oct 1, site/35). Hebrew keeps the old
          tool, untouched, until the Hebrew pass swaps in the new one with
          Hebrew words and deletes ValuationLegacy. */}
      <Route path="/valuation" component={() => <Valuation lang="en" />} />
      <Route path="/he/valuation" component={() => <ValuationLegacy lang="he" />} />
      <Route path="/he/valuation/" component={() => <ValuationLegacy lang="he" />} />
      {/* Dev only, never built into the live site: the new tool right to
          left with placeholder words, for the Hebrew-ready check. */}
      {import.meta.env.DEV && (
        <Route path="/dev/valuation-rtl">
          <Suspense fallback={null}>
            <ValuationRtlPreview />
          </Suspense>
        </Route>
      )}
      <Route path="/exit-brief" component={ExitBrief} />
      <Route path="/test-render" component={TestRender} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
