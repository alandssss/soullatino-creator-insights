import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, Eye, Zap, LogOut, MessageCircle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { CreatorDetailDialog } from "@/components/CreatorDetailDialog";
import { AdminUploadPanel } from "@/components/AdminUploadPanel";
import { AdminActivityPanel } from "@/components/AdminActivityPanel";
import { UserManagement } from "@/components/UserManagement";

type Creator = Tables<"creators">;

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchCreators();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    } else {
      setUser(user);
      
      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      setUserRole(roleData?.role || null);
    }
    setLoading(false);
  };

  const fetchCreators = async () => {
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .order("diamantes", { ascending: false });

    if (error) {
      if (error.code === 'PGRST301') {
        navigate("/login");
        return;
      }
      toast({
        title: "Error",
        description: "No se pudieron cargar los creadores",
        variant: "destructive",
      });
    } else {
      setCreators(data || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const totalCreators = creators.length;
  const totalDiamonds = creators.reduce((sum, c) => sum + (c.diamantes || 0), 0);
  const totalViews = creators.reduce((sum, c) => sum + (c.views || 0), 0);
  const avgHito = creators.reduce((sum, c) => sum + (c.hito_diamantes || 0), 0) / (creators.length || 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Soullatino Analytics
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de métricas de tus creadores</p>
        </div>

        {userRole === "admin" && (
          <>
            <div className="mb-8">
              <UserManagement />
            </div>
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminUploadPanel />
              <AdminActivityPanel />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Creadores
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalCreators}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Diamantes
              </CardTitle>
              <Zap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                {totalDiamonds.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Vistas
              </CardTitle>
              <Eye className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {(totalViews / 1000000).toFixed(1)}M
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hito Promedio
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {(avgHito / 1000).toFixed(0)}K
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Top Creadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creators.map((creator, index) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-all border border-border/30 hover:border-primary/30 cursor-pointer"
                  onClick={() => {
                    setSelectedCreator(creator);
                    setDialogOpen(true);
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{creator.nombre}</h3>
                        {creator.telefono && (
                          <a
                            href={`https://wa.me/${creator.telefono.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-green-500 hover:text-green-600 transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{creator.categoria || "Sin categoría"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">{(creator.diamantes || 0).toLocaleString()} 💎</p>
                    <p className="text-sm text-muted-foreground">Hito: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <CreatorDetailDialog
        creator={selectedCreator}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default Dashboard;
