import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Valuation from "./pages/Valuation";
import ExitBrief from "./pages/ExitBrief";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import TestRender from "./pages/TestRender";

function Router() {
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
      {/* The valuation tool, same two-URL model as the home page. The Hebrew
          route works today but nothing links to it: the toggle is hidden
          behind HEBREW_VALUATION_LIVE in pages/valuationCopy.ts until the
          Hebrew words land. */}
      <Route path="/valuation" component={() => <Valuation lang="en" />} />
      <Route path="/he/valuation" component={() => <Valuation lang="he" />} />
      <Route path="/he/valuation/" component={() => <Valuation lang="he" />} />
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
