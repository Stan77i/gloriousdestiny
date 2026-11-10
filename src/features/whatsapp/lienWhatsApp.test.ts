import { lienWhatsApp } from './lienWhatsApp'

describe('lienWhatsApp', () => {
  it('pré-remplit le message quand le numéro est connu', () => {
    const l = lienWhatsApp(
      { whatsapp_numero: '+237690000001', whatsapp_lien: null },
      'Bonjour & merci',
    )
    expect(l).toEqual({
      url: 'https://wa.me/237690000001?text=Bonjour%20%26%20merci',
      preRempli: true,
    })
  })

  it('se replie sur le lien court, sans message', () => {
    const l = lienWhatsApp(
      { whatsapp_numero: null, whatsapp_lien: 'https://wa.me/message/ABC' },
      'Bonjour',
    )
    expect(l).toEqual({ url: 'https://wa.me/message/ABC', preRempli: false })
  })

  it('ne renvoie rien sans paramètre', () => {
    expect(lienWhatsApp(undefined)).toBeNull()
    expect(lienWhatsApp({ whatsapp_numero: null, whatsapp_lien: null })).toBeNull()
  })
})
