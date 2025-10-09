import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Users, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-700" />
      
      <div className="relative z-10">
        <header className="container mx-auto px-6 py-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-glow">
              <TrendingUp className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent">
              Soullatino Analytics
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
              Analytics de{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
                Creadores TikTok
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Monitorea, analiza y optimiza el rendimiento de tus creadores de contenido con métricas en tiempo real y recomendaciones personalizadas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-glow transition-all duration-300 text-lg px-8"
              >
                Comenzar ahora
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/login")}
                className="border-border/50 hover:bg-card/50 text-lg px-8"
              >
                Iniciar sesión
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20">
              <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Métricas en Tiempo Real</h3>
                <p className="text-muted-foreground">
                  Visualiza diamantes, vistas, engagement y más con dashboards interactivos
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300">
                <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Gestión de Creadores</h3>
                <p className="text-muted-foreground">
                  Administra múltiples creadores desde un solo lugar centralizado
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Recomendaciones AI</h3>
                <p className="text-muted-foreground">
                  Recibe sugerencias automatizadas para mejorar el rendimiento
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
