import { useState, type ReactNode } from 'react'
import {
  CalendarDays,
  Download,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
} from 'lucide-react'
import { BarreRepartition } from '@/components/graphiques/BarreRepartition'
import { GraphiqueColonnes } from '@/components/graphiques/GraphiqueColonnes'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { VeineOr } from '@/components/marque/VeineOr'
import { CarteProduit } from '@/components/produit/CarteProduit'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import {
  CaseACocher,
  Champ,
  Interrupteur,
  Saisie,
  Selection,
  ZoneTexte,
} from '@/components/ui/Champs'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/ui/Etats'
import { Modale } from '@/components/ui/Modale'
import { NavPilules, Onglets } from '@/components/ui/Navigation'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { Tableau, type Colonne } from '@/components/ui/Tableau'
import { GAMME } from '@/features/catalogue/gamme'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { MESSAGES } from '@/lib/errors/ErreurApp'
import { formaterFcfa } from '@/lib/format/montant'

/*
 * Vitrine vivante du système de design (Phase 3).
 * Toutes les données chiffrées de cette page sont des EXEMPLES, signalés comme tels :
 * aucune n'est une donnée réelle de Glorious Destiny.
 */

const SECTIONS = [
  { id: 'couleurs', libelle: 'Couleurs' },
  { id: 'typographie', libelle: 'Typographie' },
  { id: 'actions', libelle: 'Actions' },
  { id: 'formulaires', libelle: 'Formulaires' },
  { id: 'etats-messages', libelle: 'États et messages' },
  { id: 'produits', libelle: 'Produits' },
  { id: 'administration', libelle: 'Administration' },
  { id: 'donnees', libelle: 'Données' },
] as const

const COULEURS: { nom: string; classe: string; valeur: string; usage: string }[] = [
  {
    nom: 'Fond',
    classe: 'bg-fond',
    valeur: '#ecebe7 · #111110',
    usage: 'Fond de page (pierre chaude)',
  },
  { nom: 'Carte', classe: 'bg-carte', valeur: '#ffffff · #1b1a19', usage: 'Cartes, panneaux' },
  { nom: 'Carte 2', classe: 'bg-carte-2', valeur: '#f4f3f0 · #242322', usage: 'Survol, pastilles' },
  {
    nom: 'Encre',
    classe: 'bg-encre',
    valeur: '#1a1816 · #f2f0ec',
    usage: 'Texte, action principale',
  },
  { nom: 'Encre 3', classe: 'bg-encre-3', valeur: '#66625b · #a29f98', usage: 'Texte discret' },
  { nom: 'Or', classe: 'bg-or', valeur: '#d6a756', usage: 'Accent : prix, à traiter, sélection' },
  {
    nom: 'Or texte',
    classe: 'bg-or-texte',
    valeur: '#8a5d10 · #ecc887',
    usage: 'Or lisible en texte',
  },
  {
    nom: 'Menthe',
    classe: 'bg-menthe',
    valeur: '#57d9a6 · #17402f',
    usage: 'Fait, livré, disponible',
  },
  { nom: 'Rose', classe: 'bg-rose', valeur: '#f8dad0', usage: 'Univers perruques' },
  { nom: 'Lilas', classe: 'bg-lilas', valeur: '#e4ddf3', usage: 'Univers cils' },
  { nom: 'Sauge', classe: 'bg-sauge', valeur: '#d4eee1', usage: 'Univers produits de pose' },
  { nom: 'Sable', classe: 'bg-sable', valeur: '#f4e6c3', usage: 'Univers salon, services' },
]

const ETATS: { nom: string; classe: string; usage: string }[] = [
  { nom: 'Succès', classe: 'bg-succes', usage: 'Livrée, payée' },
  { nom: 'Alerte', classe: 'bg-alerte', usage: 'Stock bas, à confirmer' },
  { nom: 'Danger', classe: 'bg-danger', usage: 'Épuisé, échec' },
  { nom: 'Info', classe: 'bg-info', usage: 'Information' },
]

// Données d'exemple (synthétiques).
const MOIS = [
  'Déc.',
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
]
const CA_EXEMPLE = [612, 655, 590, 702, 748, 811, 790, 905, 960, 884, 1015, 438].map((k, i) => ({
  libelle: MOIS[i] ?? '',
  valeur: k * 1000,
}))

type CommandeExemple = {
  reference: string
  cliente: string
  ville: string
  statut: { libelle: string; ton: 'or' | 'succes' | 'alerte' | 'info' | 'danger' }
  total: number
}
const COMMANDES_EXEMPLE: CommandeExemple[] = [
  {
    reference: 'GD-2611-0042',
    cliente: 'Cliente A.',
    ville: 'Douala',
    statut: { libelle: 'À confirmer', ton: 'alerte' },
    total: 27500,
  },
  {
    reference: 'GD-2611-0041',
    cliente: 'Cliente B.',
    ville: 'Yaoundé',
    statut: { libelle: 'Expédiée', ton: 'info' },
    total: 14000,
  },
  {
    reference: 'GD-2611-0040',
    cliente: 'Cliente C.',
    ville: 'Abidjan',
    statut: { libelle: 'Livrée', ton: 'succes' },
    total: 52000,
  },
  {
    reference: 'GD-2611-0039',
    cliente: 'Cliente D.',
    ville: 'Garoua',
    statut: { libelle: 'Annulée', ton: 'danger' },
    total: 9500,
  },
]

const COLONNES: Colonne<CommandeExemple>[] = [
  {
    id: 'ref',
    entete: 'Référence',
    cellule: (c) => <span className="chiffres">{c.reference}</span>,
  },
  { id: 'cliente', entete: 'Cliente', cellule: (c) => c.cliente },
  { id: 'ville', entete: 'Ville', cellule: (c) => c.ville, secondaire: true },
  {
    id: 'statut',
    entete: 'Statut',
    cellule: (c) => <Badge ton={c.statut.ton}>{c.statut.libelle}</Badge>,
  },
  { id: 'total', entete: 'Total', cellule: (c) => formaterFcfa(c.total), numerique: true },
]

const formaterMillier = (v: number) => (v === 0 ? '0' : `${String(Math.round(v / 1000))} k`)

function Section({
  id,
  titre,
  intro,
  children,
}: {
  id: string
  titre: string
  intro: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titre`}
      className="scroll-mt-24 border-t border-filet pt-14 pb-6"
    >
      <div className="mb-9 max-w-2xl">
        <h2 id={`${id}-titre`} className="titre-affiche text-[34px] text-encre sm:text-[40px]">
          {titre}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-encre-3">{intro}</p>
      </div>
      {children}
    </section>
  )
}

function Exemple() {
  return <Badge ton="info">Données d’exemple</Badge>
}

export function PageSystemeDesign() {
  useTitreDocument('Système de design')
  const { notifier } = useNotifications()
  const [modale, setModale] = useState<'centre' | 'tiroir' | null>(null)
  const [nav, setNav] = useState('commandes')
  const [onglet, setOnglet] = useState('a-confirmer')
  const [envoi, setEnvoi] = useState(false)
  const vedette = GAMME.find((p) => p.slug === 'lace-melting-spray')

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      {/* Premier écran : le titre et l'étiquette réelle */}
      <header className="grid items-stretch gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-16">
        <div className="flex flex-col justify-center">
          <h1 className="titre-affiche text-[52px] text-encre sm:text-[84px] lg:text-[92px]">
            Système
            <br />
            de design
          </h1>
          <VeineOr className="mt-6 max-w-md" />
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-encre-2">
            Le langage visuel de Glorious Destiny : un comptoir clair en pierre chaude, des cartes
            blanches, l’encre pour agir, l’or pour ce qui compte et une teinte douce par univers. Le
            thème sombre en est le reflet exact.
          </p>
          <nav aria-label="Sections du système de design" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-10 items-center rounded-full bg-carte px-4 text-sm text-encre-2 no-underline shadow-panneau transition-colors hover:bg-carte-2 hover:text-encre"
                  >
                    {s.libelle}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {vedette?.photo && (
          <figure className="relative min-h-[420px] overflow-hidden rounded-panneau border border-filet lg:min-h-[calc(100svh-8rem)]">
            <img
              src={vedette.photo.grande}
              srcSet={`${vedette.photo.petite} 800w, ${vedette.photo.grande} 1600w`}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={vedette.photo.alt}
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[50%_30%]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fond/90 to-transparent px-6 pt-16 pb-5 text-sm text-encre-2">
              {vedette.nom}
            </figcaption>
          </figure>
        )}
      </header>

      <Section
        id="couleurs"
        titre="Couleurs"
        intro="Noir chaud pour le fond, quatre marches de surface pour la profondeur, l’or réservé à ce qui compte. Les couleurs d’état ne servent jamais de décor."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COULEURS.map((c) => (
            <li
              key={c.nom}
              className="overflow-hidden rounded-panneau border border-filet bg-carte"
            >
              <span className={`block h-20 ${c.classe}`} />
              <div className="p-3.5">
                <p className="text-sm font-semibold">{c.nom}</p>
                <p className="chiffres text-xs text-encre-3">{c.valeur}</p>
                <p className="mt-1 text-xs text-encre-3">{c.usage}</p>
              </div>
            </li>
          ))}
        </ul>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ETATS.map((c) => (
            <li
              key={c.nom}
              className="flex items-center gap-3 rounded-panneau border border-filet bg-carte p-3.5"
            >
              <span className={`size-8 shrink-0 rounded-full ${c.classe}`} />
              <div>
                <p className="text-sm font-semibold">{c.nom}</p>
                <p className="text-xs text-encre-3">{c.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="typographie"
        titre="Typographie"
        intro="Une seule voix : Urbanist, géométrique et nette. Semi-grasse et serrée pour l’affiche, posée pour l’interface, les prix et les chiffres."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panneau titre="Urbanist, affiche" sousTitre="Grands titres : 600, approche −0,035 em">
            <p className="titre-affiche text-[56px] text-encre">Glorious</p>
            <p className="titre-affiche mt-1 text-[34px] text-or-texte">la pose parfaite</p>
          </Panneau>
          <Panneau titre="Urbanist" sousTitre="Interface, prix, administration">
            <dl className="flex flex-col gap-3">
              {[
                ['Titre', 'text-[28px] font-semibold', 'Vos commandes du jour'],
                ['Sous-titre', 'text-[17px] font-semibold', 'Livraisons en cours'],
                [
                  'Texte',
                  'text-[15px] text-encre-2',
                  'La commande est enregistrée avant l’ouverture de WhatsApp.',
                ],
                ['Petit', 'text-[13px] text-encre-3', 'Mis à jour il y a 2 minutes'],
                ['Prix', 'text-[21px] font-semibold text-or-texte', formaterFcfa(12500)],
              ].map(([nom, classe, texte]) => (
                <div key={nom} className="grid grid-cols-[80px_1fr] items-baseline gap-3">
                  <dt className="text-xs text-encre-3">{nom}</dt>
                  <dd className={classe}>{texte}</dd>
                </div>
              ))}
            </dl>
          </Panneau>
        </div>
      </Section>

      <Section
        id="actions"
        titre="Actions"
        intro="Une seule pilule d’encre par écran : l’action qu’on attend. L’or plein reste rare, pour ce que la cliente doit remarquer."
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Panneau
            titre="Un écran, une action principale"
            sousTitre="Hiérarchie telle qu’elle apparaît sur une page"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Bouton icone={<MessageCircle />}>Commander sur WhatsApp</Bouton>
              <Bouton variante="secondaire" icone={<CalendarDays />}>
                Prendre rendez-vous
              </Bouton>
              <Bouton variante="fantome">Voir le détail</Bouton>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-filet pt-5">
              <Bouton variante="secondaire" taille="petit" icone={<Download />}>
                Exporter
              </Bouton>
              <Bouton variante="danger" taille="petit">
                Annuler la commande
              </Bouton>
              <BoutonIcone libelle="Rechercher">
                <Search />
              </BoutonIcone>
              <BoutonIcone libelle="Panier">
                <ShoppingBag />
              </BoutonIcone>
            </div>
          </Panneau>
          <Panneau
            titre="Bouton principal"
            sousTitre="Ses tailles et ses états, jamais côte à côte en usage"
          >
            <dl className="grid grid-cols-[90px_1fr] items-center gap-x-4 gap-y-3 text-[13px]">
              <dt className="text-encre-3">Grand</dt>
              <dd>
                <Bouton taille="grand">Ajouter au panier</Bouton>
              </dd>
              <dt className="text-encre-3">En cours</dt>
              <dd>
                <Bouton
                  enCours={envoi}
                  onClick={() => {
                    setEnvoi(true)
                    setTimeout(() => {
                      setEnvoi(false)
                      notifier('Commande GD-2611-0042 confirmée.', 'succes')
                    }, 1400)
                  }}
                >
                  Confirmer
                </Bouton>
              </dd>
              <dt className="text-encre-3">Désactivé</dt>
              <dd>
                <Bouton disabled>Indisponible</Bouton>
              </dd>
            </dl>
          </Panneau>
        </div>
      </Section>

      <Section
        id="formulaires"
        titre="Formulaires"
        intro="Des champs hauts (48 px) pour le pouce, un bord lisible au soleil, l’erreur dite en clair avec la façon de la corriger."
      >
        <Panneau>
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <Champ libelle="Nom complet" obligatoire>
              {(a) => <Saisie {...a} autoComplete="name" placeholder="Votre nom" />}
            </Champ>
            <Champ
              libelle="Téléphone"
              obligatoire
              erreur="Numéro incomplet : 9 chiffres attendus après +237."
            >
              {(a) => <Saisie {...a} type="tel" inputMode="tel" defaultValue="6 90 00" />}
            </Champ>
            <Champ libelle="Ville" obligatoire>
              {(a) => (
                <Selection {...a} defaultValue="Douala">
                  <option>Douala</option>
                  <option>Yaoundé</option>
                  <option>Garoua</option>
                  <option>Abidjan</option>
                </Selection>
              )}
            </Champ>
            <Champ libelle="Quartier" aide="Exemple : Bonapriso, Bastos, Cocody.">
              {(a) => <Saisie {...a} />}
            </Champ>
            <Champ libelle="Point de repère" className="sm:col-span-2">
              {(a) => <ZoneTexte {...a} placeholder="Face à la pharmacie, portail noir…" />}
            </Champ>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <CaseACocher libelle="Recevoir les nouveautés sur WhatsApp" defaultChecked />
              <Interrupteur libelle="Produit publié sur le site" defaultChecked />
            </div>
          </form>
        </Panneau>
      </Section>

      <Section
        id="etats-messages"
        titre="États et messages"
        intro="Chaque zone a quatre états : chargement, vide, erreur, contenu. L’état ne repose jamais sur la couleur seule : toujours une icône et un mot."
      >
        <div className="flex flex-wrap gap-2">
          <Badge ton="or">Nouvelle</Badge>
          <Badge ton="alerte">À confirmer</Badge>
          <Badge ton="info">Expédiée</Badge>
          <Badge ton="succes">Livrée</Badge>
          <Badge ton="danger">Épuisé</Badge>
          <Badge>Archivé</Badge>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <Alerte
            ton="alerte"
            titre="Lace Glue bientôt épuisée"
            actions={
              <Bouton taille="petit" variante="secondaire">
                Réapprovisionner
              </Bouton>
            }
          >
            Il reste 4 unités disponibles. Rupture estimée dans 6 jours au rythme actuel.
          </Alerte>
          <Alerte ton="succes" titre="Commande enregistrée">
            Votre commande GD-2611-0042 est enregistrée. WhatsApp va s’ouvrir avec le message prêt.
          </Alerte>
          <Alerte ton="danger" titre="Créneau déjà pris">
            Ce créneau vient d’être réservé. Choisissez un autre horaire.
          </Alerte>
          <Alerte ton="info" titre="Paiement à la livraison">
            Espèces ou Mobile Money, au moment de la remise de votre colis.
          </Alerte>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Panneau corpsClassName="p-0">
            <EtatChargement libelle="Chargement des commandes…" />
          </Panneau>
          <Panneau corpsClassName="p-0">
            <EtatVide
              titre="Aucune commande à confirmer"
              action={
                <Bouton taille="petit" variante="secondaire">
                  Voir toutes les commandes
                </Bouton>
              }
            >
              Les nouvelles commandes WhatsApp apparaîtront ici.
            </EtatVide>
          </Panneau>
          <Panneau corpsClassName="p-0">
            <EtatErreur message={MESSAGES.reseau} onReessayer={() => undefined} />
          </Panneau>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Bouton
            variante="secondaire"
            taille="petit"
            onClick={() => {
              notifier('Produit ajouté au panier.', 'succes')
            }}
          >
            Notification succès
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="petit"
            onClick={() => {
              notifier(MESSAGES.stock_insuffisant, 'erreur')
            }}
          >
            Notification erreur
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="petit"
            onClick={() => {
              setModale('centre')
            }}
          >
            Ouvrir une modale
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="petit"
            onClick={() => {
              setModale('tiroir')
            }}
          >
            Ouvrir un tiroir
          </Bouton>
        </div>
      </Section>

      <Section
        id="produits"
        titre="Produits"
        intro="La gamme officielle, dans ses vrais visuels. Le produit détouré repose sur un socle à la teinte de son univers ; au survol, la photo d’usage le montre en situation. Les prix viendront de la base."
      >
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {GAMME.map((p, i) => (
            <li key={p.slug} className="h-full">
              <CarteProduit
                nom={p.nom}
                format={p.format}
                categorie={p.categorie}
                detoure={p.detoure}
                photo={p.photo?.petite}
                prix={null}
                disponibilite={i === 3 ? 'bientot_epuise' : i === 6 ? 'epuise' : 'disponible'}
                onAjouter={() => {
                  notifier(`${p.nom} ajouté au panier.`, 'succes')
                }}
              />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-encre-3">
          Disponibilités « Bientôt épuisé » et « Épuisé » montrées à titre d’exemple.
        </p>
      </Section>

      <Section
        id="administration"
        titre="Administration"
        intro="Le centre de contrôle reprend la grammaire du tableau de bord de référence : navigation en pilules, cartes très arrondies, tuiles colorées pour ce qui demande une action. Ici, la précision passe avant l’effet."
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavPilules
              libelle="Administration"
              actif={nav}
              onChoisir={setNav}
              elements={[
                { id: 'apercu', libelle: 'Aperçu' },
                { id: 'commandes', libelle: 'Commandes', compteur: 4 },
                { id: 'stock', libelle: 'Stock', compteur: 2 },
                { id: 'livraisons', libelle: 'Livraisons' },
                { id: 'rendez-vous', libelle: 'Rendez-vous', compteur: 3 },
              ]}
            />
            <Exemple />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TuileChiffre
              icone={<Wallet />}
              libelle="Chiffre d’affaires, octobre"
              valeur={formaterFcfa(1_015_000)}
              variation={{
                valeur: '14,8 %',
                sens: 'hausse',
                favorable: true,
                periode: 'vs septembre',
              }}
            />
            <TuileChiffre
              icone={<ShoppingBag />}
              libelle="Commandes à confirmer"
              valeur="4"
              complement="la plus ancienne il y a 3 h"
            />
            <TuileChiffre
              icone={<Truck />}
              libelle="Livraisons en cours"
              valeur="7"
              complement="2 à Abidjan"
            />
            <TuileChiffre
              icone={<Package />}
              libelle="Panier moyen"
              valeur={formaterFcfa(18_400)}
              variation={{
                valeur: '3,1 %',
                sens: 'baisse',
                favorable: false,
                periode: 'vs septembre',
              }}
            />
          </div>
          <Panneau
            titre="Commandes"
            sousTitre="Les plus récentes d’abord"
            action={
              <Bouton taille="petit" variante="fantome">
                Tout voir
              </Bouton>
            }
          >
            <Onglets
              libelle="Filtrer les commandes"
              actif={onglet}
              onChoisir={setOnglet}
              onglets={[
                { id: 'a-confirmer', libelle: 'À confirmer', compteur: 1 },
                { id: 'toutes', libelle: 'Toutes', compteur: 4 },
                { id: 'livrees', libelle: 'Livrées' },
              ]}
              panneau={
                <Tableau
                  legende="Commandes récentes (exemple)"
                  colonnes={COLONNES}
                  cle={(c) => c.reference}
                  lignes={
                    onglet === 'a-confirmer'
                      ? COMMANDES_EXEMPLE.filter((c) => c.statut.ton === 'alerte')
                      : onglet === 'livrees'
                        ? COMMANDES_EXEMPLE.filter((c) => c.statut.ton === 'succes')
                        : COMMANDES_EXEMPLE
                  }
                />
              }
            />
          </Panneau>
        </div>
      </Section>

      <Section
        id="donnees"
        titre="Données"
        intro="Graphiques sobres : colonnes fines, une seule couleur par série, la période en cours en or. Les quatre couleurs de villes sont validées pour les daltoniens."
      >
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panneau
            titre="Chiffre d’affaires par mois"
            sousTitre="Commandes livrées, en FCFA"
            action={<Exemple />}
          >
            <GraphiqueColonnes
              titre="Chiffre d’affaires par mois (exemple)"
              points={CA_EXEMPLE}
              enAvant={10}
              formater={formaterFcfa}
              formaterAxe={formaterMillier}
            />
          </Panneau>
          <Panneau
            titre="Ventes par ville"
            sousTitre="Part du chiffre d’affaires, octobre"
            action={<Exemple />}
          >
            <BarreRepartition
              titre="Ventes par ville (exemple)"
              formater={formaterFcfa}
              parts={[
                { libelle: 'Douala', valeur: 452_000 },
                { libelle: 'Yaoundé', valeur: 318_000 },
                { libelle: 'Garoua', valeur: 96_000 },
                { libelle: 'Abidjan', valeur: 149_000 },
              ]}
            />
            <div className="mt-6 flex flex-col gap-2.5" aria-hidden="true">
              <Squelette className="h-3 w-3/4" />
              <Squelette className="h-3 w-1/2" />
              <Squelette className="h-3 w-2/3" />
            </div>
            <p className="mt-2 text-xs text-encre-3">
              Squelette : forme d’un contenu en cours de chargement.
            </p>
          </Panneau>
        </div>
      </Section>

      <footer className="flex flex-col items-center gap-4 border-t border-filet py-14 text-center">
        <VeineOr className="max-w-xs" />
        <p className="titre-affiche text-[28px] text-encre">Glorious Destiny</p>
      </footer>

      <Modale
        ouverte={modale === 'centre'}
        onFermer={() => {
          setModale(null)
        }}
        titre="Annuler la commande GD-2611-0042 ?"
        description="Le stock réservé sera libéré. L’historique de la commande est conservé."
        pied={
          <>
            <Bouton
              variante="fantome"
              onClick={() => {
                setModale(null)
              }}
            >
              Garder la commande
            </Bouton>
            <Bouton
              variante="danger"
              onClick={() => {
                setModale(null)
                notifier('Commande annulée, stock libéré.', 'info')
              }}
            >
              Annuler la commande
            </Bouton>
          </>
        }
      >
        <Champ libelle="Motif d’annulation" obligatoire>
          {(a) => <ZoneTexte {...a} placeholder="Ex. : la cliente ne répond pas depuis 48 h" />}
        </Champ>
      </Modale>
      <Modale
        forme="tiroir"
        ouverte={modale === 'tiroir'}
        onFermer={() => {
          setModale(null)
        }}
        titre="Commande GD-2611-0041"
        description="Exemple de panneau de détail"
        pied={
          <Bouton
            onClick={() => {
              setModale(null)
            }}
          >
            Marquer expédiée
          </Bouton>
        }
      >
        <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-sm">
          <dt className="text-encre-3">Cliente</dt>
          <dd>Cliente B.</dd>
          <dt className="text-encre-3">Ville</dt>
          <dd>Yaoundé</dd>
          <dt className="text-encre-3">Statut</dt>
          <dd>
            <Badge ton="info">Expédiée</Badge>
          </dd>
          <dt className="text-encre-3">Total</dt>
          <dd className="chiffres">{formaterFcfa(14_000)}</dd>
        </dl>
      </Modale>
    </div>
  )
}
