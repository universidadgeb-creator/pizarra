import { createClient } from "@supabase/supabase-js";

// Reemplaza estos dos valores con los de tu propio proyecto de Supabase.
// Los encuentras en: Supabase → tu proyecto → Project Settings → API
// (a veces aparecen como "Project URL" y "anon public key"; en proyectos
// más nuevos puede llamarse "publishable key" — cualquiera de las dos
// funciona igual aquí). Es normal y seguro que esta llave quede visible
// en el código del sitio publicado: está diseñada para usarse desde el
// navegador. La seguridad real la dan las políticas de Row Level
// Security (RLS) que se crean en schema.sql.
const supabaseUrl = "https://gwluradnvcfhyghkapfw.supabase.co";
const supabaseAnonKey = "sb_publishable_tD6-SAp3DTZMWedGZ3oG7A_22Ey_OTy";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
