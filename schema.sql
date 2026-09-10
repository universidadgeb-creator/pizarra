-- Ejecuta todo este archivo en Supabase → SQL Editor → New query → Run.

create table if not exists public.ideas1pct (
  id text primary key,
  colaborador text,
  area text,
  proceso text,
  propuesta text,
  "fechaInicio" date,
  sistema text,
  status text,
  evidencia boolean default false,
  aprendizaje text,
  equipo text
);

-- Row Level Security: reglas simples de "cualquiera con el link puede
-- leer y escribir", igual que el comportamiento que tenías dentro de
-- Claude. No hay usuarios ni login, así que no compartas el link
-- públicamente si no quieres que cualquier visitante pueda editar el
-- tablero. Si más adelante quieres pedir inicio de sesión, se puede
-- agregar.
alter table public.ideas1pct enable row level security;

create policy "cualquiera puede leer" on public.ideas1pct
  for select using (true);

create policy "cualquiera puede insertar" on public.ideas1pct
  for insert with check (true);

create policy "cualquiera puede actualizar" on public.ideas1pct
  for update using (true);

create policy "cualquiera puede borrar" on public.ideas1pct
  for delete using (true);

-- Desde 2026 los proyectos nuevos de Supabase, por defecto, ya NO
-- expiran automáticamente sus tablas a la API (Data API) — hay que
-- otorgarlo explícitamente. Esta línea asegura que la tabla sea
-- alcanzable desde el navegador sin importar esa configuración:
grant select, insert, update, delete on public.ideas1pct to anon, authenticated;

-- Activa Realtime para esta tabla (para que los cambios de una persona
-- se vean en vivo en la pantalla de las demás, sin recargar).
alter publication supabase_realtime add table public.ideas1pct;
