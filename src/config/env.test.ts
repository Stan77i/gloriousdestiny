import { ConfigurationError, lireEnv } from './env'

const URL_OK = 'https://abc.supabase.co'

function jwt(role: string): string {
  const charge = btoa(JSON.stringify({ role })).replace(/=+$/, '')
  return `eyJhbGciOiJIUzI1NiJ9.${charge}.signature`
}

describe('lireEnv', () => {
  it('accepte une clé publishable', () => {
    const env = lireEnv({
      VITE_SUPABASE_URL: URL_OK,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnop',
    })
    expect(env.supabaseUrl).toBe(URL_OK)
  })

  it('refuse une clé secrète', () => {
    expect(() =>
      lireEnv({
        VITE_SUPABASE_URL: URL_OK,
        VITE_SUPABASE_PUBLISHABLE_KEY: ['sb', 'secret', 'abcdefghijklmnopqrst'].join('_'),
      }),
    ).toThrow(ConfigurationError)
  })

  it('refuse un jeton service_role', () => {
    expect(() =>
      lireEnv({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role') }),
    ).toThrow(/service_role/)
  })

  it('accepte le jeton anon historique', () => {
    expect(() =>
      lireEnv({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }),
    ).not.toThrow()
  })

  it('refuse une URL non https ou absente', () => {
    expect(() =>
      lireEnv({
        VITE_SUPABASE_URL: 'http://abc.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnop',
      }),
    ).toThrow(ConfigurationError)
    expect(() => lireEnv({})).toThrow(ConfigurationError)
  })
})
