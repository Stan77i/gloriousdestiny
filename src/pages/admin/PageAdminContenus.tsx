import { useState, type ChangeEvent } from 'react'
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
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
import { NavPilules } from '@/components/ui/Navigation'
import { useProduitsAdmin } from '@/features/catalogue-admin/requetes'
import { Media } from '@/features/contenus/Media'
import {
  useContenusAdmin,
  useEnregistrerContenu,
  useStatutContenu,
  useSupprimerContenu,
} from '@/features/contenus/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDate } from '@/lib/format/date'
import {
  LIBELLE_CONTENU,
  schemaContenu,
  televerser,
  TYPES_CONTENU,
  verifierFichier,
  type Contenu,
  type SaisieContenu,
  type StatutContenu,
  type TypeContenu,
} from '@/services/contenus.service'

const STATUT: Record<StatutContenu, { libelle: string; ton: 'succes' | 'neutre' | 'alerte' }> = {
  publie: { libelle: 'Publié', ton: 'succes' },
  brouillon: { libelle: 'Brouillon', ton: 'alerte' },
  depublie: { libelle: 'Dépublié', ton: 'neutre' },
}

const AIDE_TYPE: Record<TypeContenu, string> = {
  temoignage: 'Les mots d’une cliente (avec son accord) : texte et prénom, photo facultative.',
  transformation: 'Photo avant et photo après (avec l’accord de la cliente).',
  video: 'Un fichier vidéo (50 Mo au plus) ou un lien YouTube, Vimeo, TikTok, Instagram.',
  photo: 'Une photo (salon, pose, cliente avec son accord).',
  capture: 'Une capture (message reçu, publication…), sans numéro de téléphone visible.',
  produit: 'Photo ou vidéo rattachée à un produit, affichée sur sa fiche.',
}

function ChampFichier({
  libelle,
  actuel,
  onFichier,
  accepter,
}: {
  libelle: string
  actuel: string | null
  onFichier: (f: File) => void
  accepter: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-dashed border-filet-champ px-4 py-3 text-sm hover:bg-carte-2 [&_svg]:size-5 [&_svg]:text-or-texte">
      <ImagePlus aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{libelle}</span>
        <span className="block truncate text-[12px] text-encre-3">
          {actuel ? `Fichier : ${actuel.split('/').pop() ?? ''}` : 'Aucun fichier'}
        </span>
      </span>
      <input
        type="file"
        accept={accepter}
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0]
          if (f) onFichier(f)
          e.target.value = ''
        }}
      />
    </label>
  )
}

function Editeur({ initial, onFermer }: { initial: Contenu | null; onFermer: () => void }) {
  const { notifier } = useNotifications()
  const produits = useProduitsAdmin()
  const enregistrer = useEnregistrerContenu()
  const [s, setS] = useState<SaisieContenu>({
    type: initial?.type ?? 'temoignage',
    titre: initial?.titre ?? '',
    texte: initial?.texte ?? '',
    auteur: initial?.auteur ?? '',
    produitId: initial?.produitId ?? '',
    videoUrl: initial?.videoUrl ?? '',
    texteAlternatif: initial?.texteAlternatif ?? '',
    consentementCliente: initial?.consentementCliente ?? false,
    misEnAvant: initial?.misEnAvant ?? false,
  })
  const [fichier, setFichier] = useState(initial?.fichier ?? null)
  const [fichierAvant, setFichierAvant] = useState(initial?.fichierAvant ?? null)
  const [typeFichier, setTypeFichier] = useState(initial?.typeFichier ?? null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const maj = <K extends keyof SaisieContenu>(k: K, v: SaisieContenu[K]) => {
    setS((x) => ({ ...x, [k]: v }))
  }

  async function deposer(f: File, avant: boolean) {
    const verif = verifierFichier(f)
    if ('erreur' in verif) {
      setErreur(verif.erreur)
      return
    }
    if (avant && verif.type !== 'image') {
      setErreur('La photo « avant » doit être une image.')
      return
    }
    setErreur(null)
    setEnvoi(true)
    try {
      const chemin = await televerser(s.type, f)
      if (avant) setFichierAvant(chemin)
      else {
        setFichier(chemin)
        setTypeFichier(verif.type)
      }
    } catch (e) {
      setErreur(versErreurApp(e).message)
    } finally {
      setEnvoi(false)
    }
  }

  function sauver(statut: StatutContenu) {
    const r = schemaContenu.safeParse(s)
    if (!r.success) {
      setErreur(r.error.issues[0]?.message ?? 'Formulaire invalide.')
      return
    }
    setErreur(null)
    enregistrer.mutate(
      {
        id: initial?.id ?? null,
        saisie: r.data,
        fichiers: { fichier, fichierAvant, typeFichier },
        statut,
      },
      {
        onSuccess: () => {
          notifier(
            statut === 'publie' ? 'Contenu publié sur le site.' : 'Brouillon enregistré.',
            'succes',
          )
          onFermer()
        },
      },
    )
  }

  const besoinAccord = s.type === 'temoignage' || s.type === 'transformation' || s.type === 'photo'
  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={initial ? 'Modifier le contenu' : 'Nouveau contenu'}
      description={AIDE_TYPE[s.type]}
      pied={
        <>
          <Bouton
            variante="fantome"
            disabled={envoi}
            enCours={enregistrer.isPending && enregistrer.variables.statut !== 'publie'}
            onClick={() => {
              sauver('brouillon')
            }}
          >
            Brouillon
          </Bouton>
          <Bouton
            variante="or"
            disabled={envoi}
            enCours={enregistrer.isPending && enregistrer.variables.statut === 'publie'}
            onClick={() => {
              sauver('publie')
            }}
          >
            Publier
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {(erreur ?? (enregistrer.isError ? versErreurApp(enregistrer.error).message : null)) && (
          <Alerte ton="danger" titre={erreur ?? versErreurApp(enregistrer.error).message} />
        )}
        <Champ libelle="Type" obligatoire>
          {(a) => (
            <Selection
              {...a}
              value={s.type}
              onChange={(e) => {
                maj('type', e.target.value as TypeContenu)
              }}
            >
              {TYPES_CONTENU.map((t) => (
                <option key={t} value={t}>
                  {LIBELLE_CONTENU[t]}
                </option>
              ))}
            </Selection>
          )}
        </Champ>
        <Champ libelle="Titre" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              value={s.titre}
              onChange={(e) => {
                maj('titre', e.target.value)
              }}
            />
          )}
        </Champ>
        {(s.type === 'temoignage' || s.type === 'transformation' || s.type === 'produit') && (
          <Champ
            libelle={s.type === 'temoignage' ? 'Témoignage' : 'Texte'}
            obligatoire={s.type === 'temoignage'}
          >
            {(a) => (
              <ZoneTexte
                {...a}
                value={s.texte}
                onChange={(e) => {
                  maj('texte', e.target.value)
                }}
              />
            )}
          </Champ>
        )}
        {(s.type === 'temoignage' || s.type === 'transformation') && (
          <Champ
            libelle="Prénom de la cliente (et ville)"
            aide="Ex. : Awa, Douala"
            obligatoire={s.type === 'temoignage'}
          >
            {(a) => (
              <Saisie
                {...a}
                value={s.auteur}
                onChange={(e) => {
                  maj('auteur', e.target.value)
                }}
              />
            )}
          </Champ>
        )}
        {s.type === 'transformation' && (
          <ChampFichier
            libelle="Photo avant"
            actuel={fichierAvant}
            accepter="image/*"
            onFichier={(f) => void deposer(f, true)}
          />
        )}
        <ChampFichier
          libelle={
            s.type === 'transformation'
              ? 'Photo après'
              : s.type === 'video'
                ? 'Fichier vidéo'
                : 'Photo ou vidéo'
          }
          actuel={fichier}
          accepter={
            s.type === 'video'
              ? 'video/*'
              : s.type === 'photo' || s.type === 'capture' || s.type === 'transformation'
                ? 'image/*'
                : 'image/*,video/*'
          }
          onFichier={(f) => void deposer(f, false)}
        />
        {envoi && <p className="text-sm text-encre-3">Envoi du fichier…</p>}
        {(s.type === 'video' || s.type === 'produit') && (
          <Champ libelle="Ou lien vidéo" aide="YouTube, Vimeo, TikTok ou Instagram (https).">
            {(a) => (
              <Saisie
                {...a}
                type="url"
                value={s.videoUrl}
                onChange={(e) => {
                  maj('videoUrl', e.target.value)
                }}
              />
            )}
          </Champ>
        )}
        {typeFichier === 'image' && (
          <Champ
            libelle="Description de l’image"
            aide="Lue par les lecteurs d’écran. Obligatoire pour publier."
            obligatoire
          >
            {(a) => (
              <Saisie
                {...a}
                value={s.texteAlternatif}
                onChange={(e) => {
                  maj('texteAlternatif', e.target.value)
                }}
              />
            )}
          </Champ>
        )}
        <Champ
          libelle="Produit associé"
          aide={
            s.type === 'produit'
              ? 'Obligatoire pour un contenu produit.'
              : 'Facultatif : le contenu s’affichera aussi sur sa fiche.'
          }
        >
          {(a) => (
            <Selection
              {...a}
              value={s.produitId}
              onChange={(e) => {
                maj('produitId', e.target.value)
              }}
            >
              <option value="">Aucun</option>
              {produits.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </Selection>
          )}
        </Champ>
        {besoinAccord && (
          <CaseACocher
            libelle="La cliente a donné son accord pour cette publication."
            checked={s.consentementCliente}
            onChange={(e) => {
              maj('consentementCliente', e.target.checked)
            }}
          />
        )}
        <Interrupteur
          libelle="Mettre en avant (affiché en premier)"
          checked={s.misEnAvant}
          onChange={(e) => {
            maj('misEnAvant', e.target.checked)
          }}
        />
      </div>
    </Modale>
  )
}

/** Contenus : création, fichiers, publication contrôlée, dépublication, suppression. */
export function PageAdminContenus() {
  useTitreDocument('Contenus')
  const contenus = useContenusAdmin()
  const statut = useStatutContenu()
  const supprimer = useSupprimerContenu()
  const { notifier } = useNotifications()
  const [filtre, setFiltre] = useState<TypeContenu | 'tous'>('tous')
  const [edition, setEdition] = useState<Contenu | null | 'nouveau'>(null)
  const [aSupprimer, setASupprimer] = useState<Contenu | null>(null)
  const liste = (contenus.data ?? []).filter((c) => filtre === 'tous' || c.type === filtre)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">Contenus</h1>
          <p className="text-sm text-encre-3">
            Témoignages, transformations, vidéos et photos. Rien n’apparaît sur le site avant
            publication.
          </p>
        </div>
        <Bouton
          variante="or"
          icone={<Plus />}
          onClick={() => {
            setEdition('nouveau')
          }}
        >
          Nouveau contenu
        </Bouton>
      </div>
      <NavPilules
        libelle="Type de contenu"
        elements={[
          { id: 'tous', libelle: 'Tous' },
          ...TYPES_CONTENU.map((t) => ({ id: t, libelle: LIBELLE_CONTENU[t] })),
        ]}
        actif={filtre}
        onChoisir={(id) => {
          setFiltre(id as TypeContenu | 'tous')
        }}
      />
      {contenus.isError ? (
        <EtatErreur
          message={versErreurApp(contenus.error).message}
          onReessayer={() => void contenus.refetch()}
        />
      ) : contenus.isPending ? (
        <EtatChargement libelle="Chargement des contenus…" />
      ) : liste.length === 0 ? (
        <div className="rounded-panneau bg-carte shadow-panneau">
          <EtatVide titre="Aucun contenu" icone={<ImagePlus />}>
            Ajoutez un premier témoignage, une transformation ou une vidéo.
          </EtatVide>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-[26px] bg-carte p-4 shadow-panneau"
            >
              <Media c={c} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge ton={STATUT[c.statut].ton}>{STATUT[c.statut].libelle}</Badge>
                <span className="text-[12px] text-encre-3">{LIBELLE_CONTENU[c.type]}</span>
                {c.publieLe && c.statut === 'publie' && (
                  <span className="text-[12px] text-encre-3">
                    · depuis le {formaterDate(c.publieLe)}
                  </span>
                )}
              </div>
              <p className="font-semibold">{c.titre}</p>
              {c.texte && <p className="line-clamp-3 text-sm text-encre-2">« {c.texte} »</p>}
              {c.auteur && <p className="text-[13px] text-encre-3">{c.auteur}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {c.statut === 'publie' ? (
                  <Bouton
                    taille="petit"
                    variante="secondaire"
                    icone={<EyeOff />}
                    onClick={() => {
                      statut.mutate(
                        { id: c.id, statut: 'depublie' },
                        {
                          onSuccess: () => {
                            notifier('Contenu retiré du site.', 'succes')
                          },
                        },
                      )
                    }}
                  >
                    Dépublier
                  </Bouton>
                ) : (
                  <Bouton
                    taille="petit"
                    icone={<Eye />}
                    onClick={() => {
                      statut.mutate(
                        { id: c.id, statut: 'publie' },
                        {
                          onSuccess: () => {
                            notifier('Contenu publié.', 'succes')
                          },
                          onError: (e) => {
                            notifier(versErreurApp(e).message, 'erreur')
                          },
                        },
                      )
                    }}
                  >
                    Publier
                  </Bouton>
                )}
                <BoutonIcone
                  libelle={`Modifier ${c.titre}`}
                  variante="secondaire"
                  onClick={() => {
                    setEdition(c)
                  }}
                >
                  <Pencil />
                </BoutonIcone>
                <BoutonIcone
                  libelle={`Supprimer ${c.titre}`}
                  variante="fantome"
                  onClick={() => {
                    setASupprimer(c)
                  }}
                >
                  <Trash2 />
                </BoutonIcone>
              </div>
            </li>
          ))}
        </ul>
      )}
      {edition && (
        <Editeur
          key={edition === 'nouveau' ? 'nouveau' : edition.id}
          initial={edition === 'nouveau' ? null : edition}
          onFermer={() => {
            setEdition(null)
          }}
        />
      )}
      <Modale
        ouverte={aSupprimer !== null}
        onFermer={() => {
          setASupprimer(null)
        }}
        titre="Supprimer ce contenu ?"
        description="Le contenu et ses fichiers sont effacés. Pour le garder sans l’afficher, dépubliez-le plutôt."
        pied={
          <>
            <Bouton
              variante="fantome"
              onClick={() => {
                setASupprimer(null)
              }}
            >
              Garder
            </Bouton>
            <Bouton
              variante="danger"
              enCours={supprimer.isPending}
              onClick={() => {
                if (!aSupprimer) return
                supprimer.mutate(aSupprimer, {
                  onSuccess: () => {
                    notifier('Contenu supprimé.', 'succes')
                    setASupprimer(null)
                  },
                  onError: (e) => {
                    notifier(versErreurApp(e).message, 'erreur')
                  },
                })
              }}
            >
              Supprimer
            </Bouton>
          </>
        }
      >
        {aSupprimer && <p className="text-sm font-semibold">{aSupprimer.titre}</p>}
      </Modale>
    </section>
  )
}
