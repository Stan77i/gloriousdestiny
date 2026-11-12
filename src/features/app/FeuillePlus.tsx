import type { ReactNode } from 'react'
import { ChevronRight, Globe2, Lock, Monitor, Package, Phone, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Modale } from '@/components/ui/Modale'
import { SITE } from '@/config/site'
import { useAuth } from '@/features/auth/useAuth'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { lireEtat } from '@/features/notifications/cliente/memoire'
import { ReglagesSite } from '@/features/sons/ReglagesSite'
import { SelecteurTheme } from '@/features/theme/SelecteurTheme'
import { lienWhatsApp } from '@/features/whatsapp/lienWhatsApp'
import { basculerAffichage } from './mode'

function Rangee({
  icone,
  teinte,
  libelle,
  detail,
  vers,
  href,
  onClick,
}: {
  icone: ReactNode
  teinte: string
  libelle: string
  detail?: string
  vers?: string
  href?: string
  onClick: () => void
}) {
  const contenu = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-full text-encre [&_svg]:size-[18px] ${teinte}`}
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1 text-[16px] font-semibold text-encre">{libelle}</span>
      {detail && <span className="shrink-0 text-[13px] text-encre-3">{detail}</span>}
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-encre-3" />
    </>
  )
  const classes =
    'flex min-h-14 w-full items-center gap-3 rounded-[18px] px-1 text-left no-underline transition-colors active:bg-carte-2'
  if (vers)
    return (
      <Link to={vers} onClick={onClick} className={classes}>
        {contenu}
      </Link>
    )
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={classes}>
        {contenu}
      </a>
    )
  return (
    <button type="button" onClick={onClick} className={classes}>
      {contenu}
    </button>
  )
}

/**
 * Feuille « Plus » de l'application : ce qui n'est pas dans la barre d'onglets. Mes suivis
 * (commandes et demandes passées sur cet appareil), univers, salon, WhatsApp, thème, sons, et
 * la bascule vers la version ordinateur.
 */
export function FeuillePlus({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const auth = useAuth()
  const parametres = useParametresPublics()
  const suivis = ouverte ? lireEtat().suivis.slice().reverse() : []
  const equipe = auth.statut === 'connecte' && auth.profil !== null
  const whatsapp = lienWhatsApp(parametres.data, 'Bonjour Glorious Destiny,')?.url

  return (
    <Modale ouverte={ouverte} onFermer={onFermer} titre="Plus" forme="feuille" sansEntete>
      <div className="flex flex-col">
        <span aria-hidden="true" className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-filet-fort" />
        {suivis.map((s) => (
          <Rangee
            key={s.reference}
            icone={<Package strokeWidth={1.6} />}
            teinte="bg-or-doux"
            libelle={s.type === 'commande' ? 'Suivre ma commande' : 'Ma demande au salon'}
            detail={s.reference}
            vers={
              s.type === 'commande'
                ? CHEMINS.suiviCommande(s.reference)
                : CHEMINS.suiviRendezVous(s.reference)
            }
            onClick={onFermer}
          />
        ))}
        <Rangee
          icone={<span className="text-[15px] font-bold">P</span>}
          teinte="bg-rose"
          libelle="Perruques"
          vers={CHEMINS.perruques}
          onClick={onFermer}
        />
        <Rangee
          icone={<Sparkles strokeWidth={1.6} />}
          teinte="bg-lilas"
          libelle="Cils"
          vers={CHEMINS.cils}
          onClick={onFermer}
        />
        <Rangee
          icone={<Globe2 strokeWidth={1.6} />}
          teinte="bg-menthe"
          libelle="Dans le monde"
          detail={`${String(SITE.paysLivres.length)} pays`}
          vers={CHEMINS.presence}
          onClick={onFermer}
        />
        {whatsapp ? (
          <Rangee
            icone={<Phone strokeWidth={1.6} />}
            teinte="bg-sauge"
            libelle="Écrire sur WhatsApp"
            href={whatsapp}
            onClick={onFermer}
          />
        ) : (
          <Rangee
            icone={<Phone strokeWidth={1.6} />}
            teinte="bg-sauge"
            libelle="Contact"
            vers={CHEMINS.contact}
            onClick={onFermer}
          />
        )}
        <Rangee
          icone={<Lock strokeWidth={1.6} />}
          teinte="bg-carte-2"
          libelle={equipe ? 'Administration' : 'Espace équipe'}
          vers={equipe ? CHEMINS.admin : CHEMINS.connexion}
          onClick={onFermer}
        />
        <Rangee
          icone={<Monitor strokeWidth={1.6} />}
          teinte="bg-carte-2"
          libelle="Version ordinateur"
          detail="le site complet"
          onClick={() => {
            onFermer()
            basculerAffichage()
          }}
        />

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-filet pt-4">
          <span className="text-[16px] font-semibold text-encre">Thème</span>
          <SelecteurTheme />
        </div>
        <ReglagesSite className="mt-4" />
      </div>
    </Modale>
  )
}
