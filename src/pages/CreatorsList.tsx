import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, Eye, Zap, MessageCircle, Phone } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { CreatorDetailDialog } from "@/components/CreatorDetailDialog";
import { AdminUploadPanel } from "@/components/AdminUploadPanel";
import { AdminActivityPanel } from "@/components/AdminActivityPanel";
import { UserManagement } from "@/components/UserManagement";
import { LowActivityPanel } from "@/components/LowActivityPanel";
import { WorkTimeTracker } from "@/components/WorkTimeTracker";
import { CreatorPhoneUpdate } from "@/components/CreatorPhoneUpdate";

type Creator = Tables<"creators">;

const CreatorsList = () => {
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

  const totalCreators = creators.length;
  const totalDiamonds = creators.reduce((sum, c) => sum + (c.diamantes || 0), 0);
  const totalViews = creators.reduce((sum, c) => sum + (c.views || 0), 0);
  const avgHito = creators.reduce((sum, c) => sum + (c.hito_diamantes || 0), 0) / (creators.length || 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {userRole === "admin" && (
        <>
          <UserManagement />
          <CreatorPhoneUpdate />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminUploadPanel />
            <AdminActivityPanel />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-border/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3),0_0_20px_rgba(197,255,82,0.2)] hover:border-primary/50 transition-all duration-300 hover:translate-y-[-4px]">
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

        <Card className="glass-card border-border/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3),0_0_20px_rgba(255,155,71,0.2)] hover:border-accent/50 transition-all duration-300 hover:translate-y-[-4px]">
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

        <Card className="glass-card border-border/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3),0_0_20px_rgba(197,255,82,0.2)] hover:border-primary/50 transition-all duration-300 hover:translate-y-[-4px]">
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

        <Card className="glass-card border-border/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3),0_0_20px_rgba(255,155,71,0.2)] hover:border-accent/50 transition-all duration-300 hover:translate-y-[-4px]">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowActivityPanel />
        <WorkTimeTracker userEmail={user?.email} />
      </div>

      <Card className="glass-card border-primary/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">Top Creadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
              {creators.map((creator, index) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all border-2 border-border/50 hover:border-primary/30 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:translate-y-[-2px]"
                  onClick={() => {
                    setSelectedCreator(creator);
                    setDialogOpen(true);
                  }}
              >
                  <div className="flex items-center space-x-3 md:space-x-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-sm md:text-base flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-semibold text-foreground truncate">{creator.nombre}</h3>
                        {creator.telefono && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{creator.telefono}</span>
                            </span>
                            <a
                              href={`https://wa.me/${creator.telefono.replace(/[^0-9]/g, '').length === 10 ? '52' : ''}${creator.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-green-500 hover:text-green-600 transition-colors p-1 rounded-full hover:bg-green-500/10 flex-shrink-0"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{creator.categoria || "Sin categoría"}</p>
                    </div>
                  </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-accent text-sm md:text-base whitespace-nowrap">{(creator.diamantes || 0).toLocaleString()} 💎</p>
                  <p className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">Hito: {((creator.hito_diamantes || 0) / 1000).toFixed(0)}K</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CreatorDetailDialog
        creator={selectedCreator}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default CreatorsList;
