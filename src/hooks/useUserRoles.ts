import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Role = "producteur" | "torrefacteur" | "shop" | "barista" | "admin";

export const useUserRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles((data ?? []).map((r) => r.role as Role));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isProducer: roles.includes("producteur"),
    isRoaster: roles.includes("torrefacteur"),
    isShop: roles.includes("shop"),
    isBarista: roles.includes("barista"),
    isPro: roles.some((r) => ["producteur", "torrefacteur", "shop"].includes(r)),
  };
};
