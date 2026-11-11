import { describe, expect, it } from 'vitest'
import { celluleCsv, versCsv } from './csv'

describe('export CSV', () => {
  it('protège séparateurs, guillemets et formules', () => {
    expect(celluleCsv('Lace Glue')).toBe('Lace Glue')
    expect(celluleCsv('Gel; tenue "extrême"')).toBe('"Gel; tenue ""extrême"""')
    expect(celluleCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(celluleCsv(-3)).toBe('-3')
    expect(celluleCsv(null)).toBe('')
  })

  it('produit un fichier lisible par Excel en français', () => {
    expect(versCsv(['Produit', 'Vitesse'], [['Lace Glue', 1.5]])).toBe(
      '﻿Produit;Vitesse\r\nLace Glue;1.5\r\n',
    )
  })
})

describe('vitesse', () => {
  it('passe à la semaine sous une unité par jour', async () => {
    const { formaterVitesse } = await import('./format')
    expect(formaterVitesse(1)).toBe('1 / jour')
    expect(formaterVitesse(2.25)).toBe('2,3 / jour')
    expect(formaterVitesse(0.5)).toBe('3,5 / semaine')
  })
})
