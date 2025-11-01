import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
// Company pages
import About from "@/pages/about";
import Careers from "@/pages/careers";
import Press from "@/pages/press";
import Partners from "@/pages/partners";
// Legal pages
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Cookies from "@/pages/cookies";
import GDPR from "@/pages/gdpr";
import Security from "@/pages/security";
// Product/Resource pages
import Pricing from "@/pages/pricing";
import Docs from "@/pages/docs";
import APIReference from "@/pages/api-reference";
import SDK from "@/pages/sdk";
import UseCases from "@/pages/use-cases";
import Integrations from "@/pages/integrations";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Company routes */}
      <Route path="/about" component={About} />
      <Route path="/careers" component={Careers} />
      <Route path="/press" component={Press} />
      <Route path="/partners" component={Partners} />
      {/* Legal routes */}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/cookies" component={Cookies} />
      <Route path="/gdpr" component={GDPR} />
      <Route path="/security" component={Security} />
      {/* Product/Resource routes */}
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/documentation" component={Docs} />
      <Route path="/api" component={APIReference} />
      <Route path="/api-reference" component={APIReference} />
      <Route path="/sdk" component={SDK} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/integrations" component={Integrations} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
