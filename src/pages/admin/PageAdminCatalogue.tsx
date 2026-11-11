import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Interrupteur, Saisie, ZoneTexte } from '@/components/ui/Champs'
import { EtatChargement, EtatErreur } from '@/components/ui/Etats'
import { Modale } from '@/components/ui/Modale'
import { NavPilules } from '@/components/ui/Navigation'
import { Panneau } from '@/components/ui/Panneau'
import { Tableau } from '@/components/ui/Tableau'
import {
  JOURS_SEMAINE,
  plageValide,
  resumerHoraires,
  type JourHoraire,
} from '@/features/catalogue-admin/horaires'
import {
  useEnregistrerHoraires,
  useHoraires,
  useModifierProduit,
  useModifierService,
  useProduitsAdmin,
  useServicesAdmin,
} from '@/features/catalogue-admin/requetes'
import { ModalePrestation } from '@/features/catalogue-admin/ModalePrestation'
import { PromotionsProduit } from '@/features/catalogue-admin/Promotions'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDuree } from '@/lib/format/duree'
import { formaterFcfa } from '@/lib/format/montant'
import {
  schemaProduit,
  schemaService,
  type Horaire,
  type ProduitAdmin,
  type SaisieProduit,
  type SaisieService,
  type ServiceAdmin,
} from '@/services/catalogueAdmin.service'

type Erreurs = Partial<Record<string, string>>

function erreursDe(issues: { path: PropertyKey[]; message: string }[]): Erreurs {
  const e: Erreurs = {}
  for (const i of issues) {
    const cle = String(i.path[0] ?? '')
    e[cle] ??= i.message
  }
  return e
}

function nombre(n: number | null): string {
  return n === null ? '' : String(n)
}

function ModaleProduit({ produit, onFermer }: { produit: ProduitAdmin; onFermer: () => void }) {
  const { notifier } = useNotifications()
  const modifier = useModifierProduit()
  const [v, setV] = useState<SaisieProduit>({
    prix: String(produit.prixFcfa),
    publie: produit.publie,
    description: produit.description,
    seuilAlerte: String(produit.seuilAlerte),
    delaiAppro: nombre(produit.delaiApproJours),
    stockSecurite: nombre(produit.stockSecuriteJours),
  })
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const maj = (champ: keyof SaisieProduit) => (valeur: string | boolean) => {
    setV((x) => ({ ...x, [champ]: valeur }))
  }

  function enregistrer() {
    const r = schemaProduit.safeParse(v)
    if (!r.success) {
      setErreurs(erreursDe(r.error.issues))
      return
    }
    setErreurs({})
    modifier.mutate(
      { id: produit.id, saisie: r.data },
      {
        onSuccess: () => {
          notifier(`${produit.nom} : modifications enregistrées.`, 'succes')
          onFermer()
        },
      },
    )
  }

  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={produit.nom}
      description="Les commandes déjà passées gardent le prix du jour où elles ont été faites."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton enCours={modifier.isPending} onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {modifier.isError && <Alerte ton="danger" titre={versErreurApp(modifier.error).message} />}
        <Champ libelle="Prix (FCFA)" obligatoire erreur={erreurs['prix']}>
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={v.prix}
              onChange={(e) => {
                maj('prix')(e.target.value)
              }}
            />
          )}
        </Champ>
        <Interrupteur
          libelle={v.publie ? 'Visible sur le site' : 'Masqué du site'}
          checked={v.publie}
          onChange={(e) => {
            maj('publie')(e.target.checked)
          }}
        />
        <Champ
          libelle="Description courte"
          aide="Affichée sur la carte du produit et en tête de sa fiche."
          erreur={erreurs['description']}
        >
          {(a) => (
            <ZoneTexte
              {...a}
              value={v.description}
              onChange={(e) => {
                maj('description')(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ
          libelle="Seuil d’alerte de stock"
          aide="En dessous, l’article passe « bientôt épuisé »."
          obligatoire
          erreur={erreurs['seuilAlerte']}
        >
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={v.seuilAlerte}
              onChange={(e) => {
                maj('seuilAlerte')(e.target.value)
              }}
            />
          )}
        </Champ>
        <div className="grid gap-5 sm:grid-cols-2">
          <Champ
            libelle="Délai de réapprovisionnement (jours)"
            aide="Facultatif"
            erreur={erreurs['delaiAppro']}
          >
            {(a) => (
              <Saisie
                {...a}
                inputMode="numeric"
                value={v.delaiAppro}
                onChange={(e) => {
                  maj('delaiAppro')(e.target.value)
                }}
              />
            )}
          </Champ>
          <Champ
            libelle="Stock de sécurité (jours)"
            aide="Facultatif"
            erreur={erreurs['stockSecurite']}
          >
            {(a) => (
              <Saisie
                {...a}
                inputMode="numeric"
                value={v.stockSecurite}
                onChange={(e) => {
                  maj('stockSecurite')(e.target.value)
                }}
              />
            )}
          </Champ>
        </div>
        <PromotionsProduit produitId={produit.id} prixProduit={produit.prixFcfa} />
      </div>
    </Modale>
  )
}

function Produits() {
  const produits = useProduitsAdmin()
  const [edition, setEdition] = useState<ProduitAdmin | null>(null)
  if (produits.isError)
    return (
      <EtatErreur
        message={versErreurApp(produits.error).message}
        onReessayer={() => void produits.refetch()}
      />
    )
  if (produits.isPending) return <EtatChargement libelle="Chargement des produits…" />
  return (
    <>
      <Tableau
        legende="Produits du catalogue"
        cle={(p) => p.id}
        lignes={produits.data}
        colonnes={[
          {
            id: 'nom',
            entete: 'Produit',
            pleineLargeur: true,
            cellule: (p) => (
              <span className="flex flex-col">
                <span className="font-medium">{p.nom}</span>
                <span className="text-[13px] text-encre-3">{p.categorie}</span>
              </span>
            ),
          },
          {
            id: 'prix',
            entete: 'Prix',
            numerique: true,
            cellule: (p) => <span className="chiffres">{formaterFcfa(p.prixFcfa)}</span>,
          },
          {
            id: 'site',
            entete: 'Sur le site',
            cellule: (p) =>
              p.publie ? <Badge ton="succes">Visible</Badge> : <Badge>Masqué</Badge>,
          },
          {
            id: 'seuil',
            entete: 'Seuil d’alerte',
            numerique: true,
            secondaire: true,
            cellule: (p) => <span className="chiffres">{p.seuilAlerte}</span>,
          },
          {
            id: 'action',
            entete: 'Action',
            numerique: true,
            pleineLargeur: true,
            cellule: (p) => (
              <Bouton
                variante="secondaire"
                taille="petit"
                icone={<Pencil />}
                aria-label={`Modifier ${p.nom}`}
                onClick={() => {
                  setEdition(p)
                }}
              >
                Modifier
              </Bouton>
            ),
          },
        ]}
      />
      {edition && (
        <ModaleProduit
          key={edition.id}
          produit={edition}
          onFermer={() => {
            setEdition(null)
          }}
        />
      )}
    </>
  )
}

function ModaleService({ service, onFermer }: { service: ServiceAdmin; onFermer: () => void }) {
  const { notifier } = useNotifications()
  const modifier = useModifierService()
  const [v, setV] = useState<SaisieService>({
    prix: String(service.prixFcfa),
    duree: String(service.dureeMinutes),
    tampon: String(service.tamponApresMinutes),
    publie: service.publie,
    description: service.description,
  })
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const maj = (champ: keyof SaisieService) => (valeur: string | boolean) => {
    setV((x) => ({ ...x, [champ]: valeur }))
  }

  function enregistrer() {
    const r = schemaService.safeParse(v)
    if (!r.success) {
      setErreurs(erreursDe(r.error.issues))
      return
    }
    setErreurs({})
    modifier.mutate(
      { id: service.id, saisie: r.data },
      {
        onSuccess: () => {
          notifier(`${service.nom} : modifications enregistrées.`, 'succes')
          onFermer()
        },
      },
    )
  }

  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={service.nom}
      description="Les rendez-vous déjà pris gardent leur prix et leur durée."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton enCours={modifier.isPending} onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {modifier.isError && <Alerte ton="danger" titre={versErreurApp(modifier.error).message} />}
        <Champ libelle="Prix (FCFA)" obligatoire erreur={erreurs['prix']}>
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={v.prix}
              onChange={(e) => {
                maj('prix')(e.target.value)
              }}
            />
          )}
        </Champ>
        <div className="grid gap-5 sm:grid-cols-2">
          <Champ libelle="Durée (minutes)" obligatoire erreur={erreurs['duree']}>
            {(a) => (
              <Saisie
                {...a}
                inputMode="numeric"
                value={v.duree}
                onChange={(e) => {
                  maj('duree')(e.target.value)
                }}
              />
            )}
          </Champ>
          <Champ
            libelle="Battement après (minutes)"
            aide="Rangement, nettoyage"
            obligatoire
            erreur={erreurs['tampon']}
          >
            {(a) => (
              <Saisie
                {...a}
                inputMode="numeric"
                value={v.tampon}
                onChange={(e) => {
                  maj('tampon')(e.target.value)
                }}
              />
            )}
          </Champ>
        </div>
        <Interrupteur
          libelle={v.publie ? 'Réservable sur le site' : 'Masquée du site'}
          checked={v.publie}
          onChange={(e) => {
            maj('publie')(e.target.checked)
          }}
        />
        <Champ libelle="Description" erreur={erreurs['description']}>
          {(a) => (
            <ZoneTexte
              {...a}
              value={v.description}
              onChange={(e) => {
                maj('description')(e.target.value)
              }}
            />
          )}
        </Champ>
      </div>
    </Modale>
  )
}

function Prestations() {
  const services = useServicesAdmin()
  const [edition, setEdition] = useState<ServiceAdmin | null>(null)
  if (services.isError)
    return (
      <EtatErreur
        message={versErreurApp(services.error).message}
        onReessayer={() => void services.refetch()}
      />
    )
  if (services.isPending) return <EtatChargement libelle="Chargement des prestations…" />
  return (
    <>
      <Tableau
        legende="Prestations du salon"
        cle={(s) => s.id}
        lignes={services.data}
        colonnes={[
          {
            id: 'nom',
            entete: 'Prestation',
            pleineLargeur: true,
            cellule: (s) => (
              <span className="flex flex-col">
                <span className="font-medium">{s.nom}</span>
                <span className="text-[13px] text-encre-3">
                  {s.mode === 'demande'
                    ? `Nos prestations · sur demande${s.image ? '' : ' · sans photo'}`
                    : 'Agenda du salon'}
                </span>
              </span>
            ),
          },
          {
            id: 'duree',
            entete: 'Durée',
            cellule: (s) => (
              <span className="flex flex-col">
                {s.mode === 'demande' ? '—' : formaterDuree(s.dureeMinutes)}
                {s.tamponApresMinutes > 0 && (
                  <span className="text-[13px] text-encre-3">
                    + {s.tamponApresMinutes} min de battement
                  </span>
                )}
              </span>
            ),
          },
          {
            id: 'prix',
            entete: 'Prix',
            numerique: true,
            cellule: (s) => <span className="chiffres">{formaterFcfa(s.prixFcfa)}</span>,
          },
          {
            id: 'site',
            entete: 'Sur le site',
            cellule: (s) =>
              s.publie ? (
                <Badge ton="succes">{s.mode === 'demande' ? 'Disponible' : 'Réservable'}</Badge>
              ) : (
                <Badge>{s.mode === 'demande' ? 'Indisponible' : 'Masquée'}</Badge>
              ),
          },
          {
            id: 'action',
            entete: 'Action',
            numerique: true,
            pleineLargeur: true,
            cellule: (s) => (
              <Bouton
                variante="secondaire"
                taille="petit"
                icone={<Pencil />}
                aria-label={`Modifier ${s.nom}`}
                onClick={() => {
                  setEdition(s)
                }}
              >
                Modifier
              </Bouton>
            ),
          },
        ]}
      />
      {edition?.mode === 'demande' && (
        <ModalePrestation
          key={edition.id}
          service={edition}
          onFermer={() => {
            setEdition(null)
          }}
        />
      )}
      {edition && edition.mode === 'creneau' && (
        <ModaleService
          key={edition.id}
          service={edition}
          onFermer={() => {
            setEdition(null)
          }}
        />
      )}
    </>
  )
}

type LigneHoraire = JourHoraire & { id: string | null }

function versLignes(horaires: Horaire[]): LigneHoraire[] {
  return JOURS_SEMAINE.map(({ jour }) => {
    const h = horaires.find((x) => x.jourSemaine === jour)
    return h
      ? { id: h.id, jourSemaine: jour, ouvert: h.actif, debut: h.debut, fin: h.fin }
      : { id: null, jourSemaine: jour, ouvert: false, debut: '09:00', fin: '18:00' }
  })
}

function EditeurHoraires({ initiales }: { initiales: Horaire[] }) {
  const { notifier } = useNotifications()
  const enregistrer = useEnregistrerHoraires()
  const [lignes, setLignes] = useState<LigneHoraire[]>(() => versLignes(initiales))
  const invalides = lignes.filter((l) => l.ouvert && !plageValide(l.debut, l.fin))
  const resume = resumerHoraires(lignes)
  const maj = (jour: number, patch: Partial<LigneHoraire>) => {
    setLignes((ls) => ls.map((l) => (l.jourSemaine === jour ? { ...l, ...patch } : l)))
  }

  return (
    <Panneau
      titre="Horaires d’ouverture du salon"
      sousTitre="Les créneaux de réservation en ligne sont calculés à partir de ces horaires."
    >
      <ul className="divide-y divide-filet">
        {JOURS_SEMAINE.map(({ jour, nom }) => {
          const l = lignes.find((x) => x.jourSemaine === jour)
          if (!l) return null
          const erreur = l.ouvert && !plageValide(l.debut, l.fin)
          return (
            <li
              key={jour}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[140px_auto_minmax(0,1fr)]"
            >
              <span className="font-medium capitalize">{nom}</span>
              <Interrupteur
                libelle={l.ouvert ? 'Ouvert' : 'Fermé'}
                checked={l.ouvert}
                onChange={(e) => {
                  maj(jour, { ouvert: e.target.checked })
                }}
              />
              {l.ouvert && (
                <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
                  <div className="w-36">
                    <Saisie
                      type="time"
                      aria-label={`${nom} : ouverture`}
                      value={l.debut}
                      step={900}
                      onChange={(e) => {
                        maj(jour, { debut: e.target.value })
                      }}
                    />
                  </div>
                  <span className="text-encre-3">à</span>
                  <div className="w-36">
                    <Saisie
                      type="time"
                      aria-label={`${nom} : fermeture`}
                      value={l.fin}
                      step={900}
                      onChange={(e) => {
                        maj(jour, { fin: e.target.value })
                      }}
                    />
                  </div>
                  {erreur && (
                    <span role="alert" className="text-[13px] text-danger">
                      La fermeture doit suivre l’ouverture.
                    </span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 rounded-bloc bg-carte-2 px-4 py-3 text-sm text-encre-2">
        Affiché sur le site : <strong className="text-encre">{resume}</strong>
      </p>
      {enregistrer.isError && (
        <Alerte className="mt-4" ton="danger" titre={versErreurApp(enregistrer.error).message} />
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Bouton
          disabled={invalides.length > 0}
          enCours={enregistrer.isPending}
          onClick={() => {
            enregistrer.mutate(
              { jours: lignes, resume },
              {
                onSuccess: () => {
                  notifier('Horaires enregistrés.', 'succes')
                },
              },
            )
          }}
        >
          Enregistrer les horaires
        </Bouton>
        <span className="text-[13px] text-encre-3">
          Pour une fermeture ponctuelle (jour férié…), utilisez l’agenda des rendez-vous.
        </span>
      </div>
    </Panneau>
  )
}

function Horaires() {
  const horaires = useHoraires()
  if (horaires.isError)
    return (
      <EtatErreur
        message={versErreurApp(horaires.error).message}
        onReessayer={() => void horaires.refetch()}
      />
    )
  if (horaires.isPending) return <EtatChargement libelle="Chargement des horaires…" />
  return <EditeurHoraires initiales={horaires.data} />
}

const VUES = [
  { id: 'produits', libelle: 'Produits' },
  { id: 'prestations', libelle: 'Prestations' },
  { id: 'horaires', libelle: 'Horaires' },
] as const
type Vue = (typeof VUES)[number]['id']

/** Catalogue (administration) : prix, visibilité, seuils, prestations et horaires du salon. */
export function PageAdminCatalogue() {
  useTitreDocument('Catalogue')
  const [vue, setVue] = useState<Vue>('produits')
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">Catalogue</h1>
          <p className="text-sm text-encre-3">
            Prix, visibilité sur le site, prestations et horaires. Chaque modification est tracée.
          </p>
        </div>
        <NavPilules
          libelle="Rubriques du catalogue"
          elements={VUES.map((v) => ({ id: v.id, libelle: v.libelle }))}
          actif={vue}
          onChoisir={(id) => {
            setVue(id as Vue)
          }}
        />
      </div>
      {vue === 'produits' && <Produits />}
      {vue === 'prestations' && <Prestations />}
      {vue === 'horaires' && <Horaires />}
    </section>
  )
}
