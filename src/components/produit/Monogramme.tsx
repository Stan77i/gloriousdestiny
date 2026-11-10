/** Visuel de repli quand un produit n'a pas encore d'image : son initiale en didone. */
export function Monogramme({ nom }: { nom: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center text-[64px] font-semibold tracking-[-0.04em] text-or/60"
    >
      {nom.trim().charAt(0).toUpperCase()}
    </span>
  )
}
