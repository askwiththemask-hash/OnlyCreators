import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Browse from "@/pages/browse";
import Category from "@/pages/category";
import SampleDetail from "@/pages/sample-detail";
import CreatorProfile from "@/pages/creator-profile";
import Dashboard from "@/pages/dashboard/index";
import DashboardUpload from "@/pages/dashboard/upload";
import DashboardProfile from "@/pages/dashboard/profile";
import UserProfile from "@/pages/profile";
import Requests from "@/pages/requests/index";
import NewRequest from "@/pages/requests/new";
import Admin from "@/pages/admin/index";
import AdminSamples from "@/pages/admin/samples";
import AdminUsers from "@/pages/admin/users";
import Messages from "@/pages/messages";
import Mods from "@/pages/mods";
import Saved from "@/pages/saved";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/browse" component={Browse} />
      <Route path="/mods" component={Mods} />
      <Route path="/category/:slug" component={Category} />
      <Route path="/sample/:id" component={SampleDetail} />
      <Route path="/creator/:id" component={CreatorProfile} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/messages" component={Messages} />
      <Route path="/saved" component={Saved} />

      {/* Dashboard Routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/upload" component={DashboardUpload} />
      <Route path="/dashboard/profile" component={DashboardProfile} />

      {/* Requests */}
      <Route path="/requests" component={Requests} />
      <Route path="/requests/new" component={NewRequest} />

      {/* Admin */}
      <Route path="/admin" component={Admin} />
      <Route path="/admin/samples" component={AdminSamples} />
      <Route path="/admin/users" component={AdminUsers} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
