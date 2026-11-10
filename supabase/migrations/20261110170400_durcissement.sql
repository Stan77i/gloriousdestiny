-- Glorious Destiny — durcissement après analyse des conseillers Supabase.
-- 1. rls_auto_enable() est la fonction de l'option « Enable automatic RLS ».
--    Elle n'a pas à être appelable par l'API : l'event trigger fonctionne sans ce droit.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- 2. Clé étrangère non indexée.
create index if not exists parametres_modifie_par_idx on public.parametres (modifie_par);

-- Rappel : public.entree_stock et public.disponibilite_variantes sont SECURITY DEFINER
-- volontairement. entree_stock vérifie le rôle ; disponibilite_variantes ne renvoie
-- qu'un booléen par variante publiée, jamais de quantité.
