/** Durée lisible : 90 → « 1 h 30 », 120 → « 2 h », 45 → « 45 min ». */
export function formaterDuree(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${String(m)} min`
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m).padStart(2, '0')}`
}
