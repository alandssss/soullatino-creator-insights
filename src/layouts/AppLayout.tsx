import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, NavLink } from "react-router-dom";
import DashboardOverview from "@/pages/DashboardOverview";
import Reclutamiento from "@/pages/Reclutamiento";
import SupervisionLive from "@/pages/SupervisionLive";
import CreatorsList from "@/pages/CreatorsList";
import NotFound from "@/pages/NotFound";
import logo from "@/assets/logo-optimized.webp";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const AppLayout = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setUserRole(roleData?.role || null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isAdmin = userRole === 'admin';

  const navLinks = [
    { to: "/dashboard/pending", label: "Dashboard", adminOnly: false },
    { to: "/creators", label: "Administración", adminOnly: true },
    { to: "/supervision", label: "Supervisión", adminOnly: false },
    { to: "/reclutamiento", label: "Reclutamiento", adminOnly: false },
  ].filter(link => !link.adminOnly || isAdmin);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 neo-card sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <img src={logo} alt="Soullatino" className="h-8 w-8 md:h-10 md:w-10 object-contain" width="40" height="40" loading="eager" />
              <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Soullatino Analytics
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "neo-card-sm border border-primary/30 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden md:flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-lg neo-card-sm border border-primary/30">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Agencia:</span>
              <span className="text-sm font-semibold text-primary">Soullatino</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden neo-button">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="neo-card">
                <nav className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "neo-card-sm border border-primary/30 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 neo-button"
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/pending" replace />} />
          <Route path="/dashboard/*" element={<DashboardOverview />} />
          <Route path="/creators" element={<CreatorsList />} />
          <Route path="/reclutamiento" element={<Reclutamiento />} />
          <Route path="/supervision" element={<SupervisionLive />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

export default AppLayout;
