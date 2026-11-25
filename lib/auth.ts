import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** The signed-in person, or null. History is stored per account on this device. */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setUser(data.user); }).catch(() => { if (active) setUser(null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return user;
}

export const historyKeyFor = (user: User | null) => (user ? `user-${user.id}` : "guest");
