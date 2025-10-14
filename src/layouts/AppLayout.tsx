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
    <div className="min-h-screen bg-gradient-dark w-full overflow-x-hidden">
      <header className="border-b border-border/50 glass-effect sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-3 md:px-6 py-2 md:py-4 max-w-full">
          <div className="flex items-center justify-between gap-2">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="relative group flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-premium rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <img 
                    src={logo} 
                    alt="Soullatino" 
                    className="relative h-7 w-7 md:h-10 md:w-10 object-contain" 
                    width="40" 
                    height="40" 
                    loading="eager" 
                  />
                </div>
                <h1 className="text-sm md:text-2xl font-bold bg-gradient-premium bg-clip-text text-transparent animate-fade-in truncate">
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
                      `px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? "neo-card-sm border border-primary/30 text-primary shadow-glow-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden neo-button flex-shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="neo-card border-r border-border/50 w-[280px] max-w-[80vw]">
                  <nav className="flex flex-col gap-3 mt-8">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? "neo-card-sm border border-primary/30 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
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
                className="neo-button hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 flex-shrink-0"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full overflow-x-hidden">
        <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 max-w-full">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/pending" replace />} />
            <Route path="/dashboard/*" element={<DashboardOverview />} />
            <Route path="/creators" element={<CreatorsList />} />
            <Route path="/reclutamiento" element={<Reclutamiento />} />
            <Route path="/supervision" element={<SupervisionLive />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
