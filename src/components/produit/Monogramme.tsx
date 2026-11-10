/** Visuel de repli quand un produit n'a pas encore d'image : son initiale en didone. */
export function Monogramme({ nom }: { nom: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center font-display text-[64px] text-or/60"
    >
      {nom.trim().charAt(0).toUpperCase()}
    </span>
  )
}
