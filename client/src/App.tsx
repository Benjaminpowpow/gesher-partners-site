import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
      {/* ENGLISH-ONLY (2026-06-04): root serves English while the Hebrew site is
          parked. To restore Hebrew, change the "/" route back to <Home lang="he" />
          (see also Home.tsx SHOW_LANG_SWITCH and server/_core/vite.ts ENGLISH_ONLY). */}
      <Route path="/" component={() => <Home lang="en" />} />
      <Route path="/en" component={() => <Home lang="en" />} />
      <Route path="/en/" component={() => <Home lang="en" />} />
      <Route path="/valuation" component={Valuation} />
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
