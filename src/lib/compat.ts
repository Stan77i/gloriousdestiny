/**
 * Compléments pour les navigateurs plus anciens (iPhone sous iOS 15.0–15.3, vieux Chrome) :
 * fonctions utilisées par le site mais absentes de ces versions. Chargé en premier.
 */

if (typeof Array.prototype.at !== 'function') {
  Object.defineProperty(Array.prototype, 'at', {
    configurable: true,
    writable: true,
    value: function at<T>(this: T[], n: number): T | undefined {
      const i = Math.trunc(n) || 0
      return this[i < 0 ? this.length + i : i]
    },
  })
}

if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  Object.defineProperty(crypto, 'randomUUID', {
    configurable: true,
    writable: true,
    value: function randomUUID(): string {
      const o = crypto.getRandomValues(new Uint8Array(16))
      o[6] = ((o[6] ?? 0) & 0x0f) | 0x40
      o[8] = ((o[8] ?? 0) & 0x3f) | 0x80
      const h = Array.from(o, (b) => b.toString(16).padStart(2, '0')).join('')
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
    },
  })
}

export {}
