import { useEffect, useRef } from 'react'
import { useAEcran } from '@/hooks/useAEcran'
import { cx } from '@/lib/cx'

/**
 * Soie d'or : fond du premier écran dessiné en WebGL. Des rubans de fils dorés ondulent
 * lentement, comme une chevelure ou une soie qui prend la lumière ; un reflet les parcourt.
 * - Léger : un seul passage de shader, résolution réduite, 30 images/s au plus ;
 * - s'arrête hors écran et onglet caché ;
 * - « mouvement réduit » : une seule image, fixe ;
 * - sans WebGL : dégradé or statique (CSS), jamais de vide.
 * Suit le thème : fond ivoire et or profond en clair, fond nuit et or lumineux en sombre.
 */

const SOMMETS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAGMENTS = `
precision mediump float;
uniform vec2 r;
uniform float t;
uniform vec3 fond;
uniform float nuit;
uniform float portrait;

float ruban(float y, float centre, float largeur) {
  return smoothstep(largeur, 0.0, abs(y - centre));
}

void main() {
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = (gl_FragCoord.xy - 0.5 * r) / min(r.x, r.y);
  // Sur téléphone, la soie tombe en diagonale dans le bas de l'écran (le texte est en haut).
  if (portrait > 0.5) p = vec2(p.x * 0.8 + p.y * 0.35, p.y * 0.9 - p.x * 0.35 + 0.35);
  float tt = t * 0.11;

  // Écoulement : la soie ondule, grandes et petites vagues superposées.
  float w = sin(p.x * 1.25 + tt) * 0.33
          + sin(p.x * 2.6 - tt * 1.35) * 0.11
          + sin(p.y * 1.1 + tt * 0.6) * 0.16;
  float y = p.y + w;

  // Trois rubans de largeurs différentes.
  float b = ruban(y, 0.12 + 0.10 * sin(p.x * 1.9 + tt * 0.7), 0.24)
          + 0.85 * ruban(y, -0.28 + 0.12 * sin(p.x * 1.4 - tt * 0.9), 0.17)
          + 0.6 * ruban(y, 0.5 - 0.10 * sin(p.x * 2.3 + tt), 0.12);

  // Fils fins à l'intérieur des rubans.
  float f = 0.5 + 0.5 * sin(y * 120.0 + sin(p.x * 3.0 + tt) * 2.2);
  f = pow(f, 5.0);

  // Reflet de lumière qui glisse le long de la soie.
  float reflet = pow(0.5 + 0.5 * sin(p.x * 2.1 - y * 3.2 - tt * 1.7), 9.0);

  float a = b * (0.28 + 0.72 * f) * (0.45 + 1.1 * reflet);
  vec3 orProfond = nuit > 0.5 ? vec3(0.55, 0.37, 0.10) : vec3(0.62, 0.42, 0.11);
  vec3 orClair = nuit > 0.5 ? vec3(0.97, 0.86, 0.62) : vec3(0.84, 0.65, 0.34);
  vec3 or_ = mix(orProfond, orClair, clamp(reflet * 1.2 + f * 0.25, 0.0, 1.0));
  float force = nuit > 0.5 ? 0.95 : 0.92;
  vec3 c = mix(fond, or_, clamp(a, 0.0, 1.0) * force);
  // Vignette douce sur les bords.
  c = mix(c, fond, smoothstep(0.55, 1.05, length(uv - 0.5) * 1.25) * 0.6);
  gl_FragColor = vec4(c, 1.0);
}`

function couleurFond(): [number, number, number] {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--gd-fond').trim()
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v)
  if (!m) return [0.953, 0.937, 0.902]
  return [
    parseInt(m[1] ?? '0', 16) / 255,
    parseInt(m[2] ?? '0', 16) / 255,
    parseInt(m[3] ?? '0', 16) / 255,
  ]
}

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, source)
  gl.compileShader(s)
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
}

export function SoieOr({ className }: { className?: string }) {
  const { ref, visible } = useAEcran<HTMLCanvasElement>()
  const actif = useRef(true)
  const relancer = useRef<() => void>(() => undefined)

  useEffect(() => {
    actif.current = visible
    relancer.current()
  }, [visible])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    })
    if (!gl) {
      canvas.dataset['repli'] = 'oui'
      return
    }
    const vs = compiler(gl, gl.VERTEX_SHADER, SOMMETS)
    const fs = compiler(gl, gl.FRAGMENT_SHADER, FRAGMENTS)
    const prog = gl.createProgram()
    if (!vs || !fs) {
      canvas.dataset['repli'] = 'oui'
      return
    }
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.dataset['repli'] = 'oui'
      return
    }
    gl.useProgram(prog)
    const tampon = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, tampon)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    const uR = gl.getUniformLocation(prog, 'r')
    const uT = gl.getUniformLocation(prog, 't')
    const uFond = gl.getUniformLocation(prog, 'fond')
    const uNuit = gl.getUniformLocation(prog, 'nuit')
    const uPortrait = gl.getUniformLocation(prog, 'portrait')

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let dernier = 0
    const debut = performance.now()
    // Départ décalé : la première image montre déjà une soie bien dessinée.
    const decalage = 18

    const appliquerTheme = () => {
      const f = couleurFond()
      gl.uniform3f(uFond, f[0], f[1], f[2])
      gl.uniform1f(uNuit, document.documentElement.dataset['theme'] === 'sombre' ? 1 : 0)
    }
    const dimensionner = () => {
      // Résolution réduite : la soie est floue par nature, le téléphone reste fluide.
      const echelle = Math.min(window.devicePixelRatio, 1.5) * 0.6
      const l = Math.max(1, Math.round(canvas.clientWidth * echelle))
      const h = Math.max(1, Math.round(canvas.clientHeight * echelle))
      if (canvas.width !== l || canvas.height !== h) {
        canvas.width = l
        canvas.height = h
        gl.viewport(0, 0, l, h)
      }
      gl.uniform2f(uR, l, h)
      gl.uniform1f(uPortrait, canvas.clientHeight > canvas.clientWidth * 1.1 ? 1 : 0)
    }
    const dessiner = (maintenant: number) => {
      gl.uniform1f(uT, decalage + (reduit.matches ? 0 : (maintenant - debut) / 1000))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const boucle = (maintenant: number) => {
      raf = 0
      if (!actif.current || document.hidden || reduit.matches) return
      if (maintenant - dernier >= 33) {
        dernier = maintenant
        dessiner(maintenant)
      }
      raf = requestAnimationFrame(boucle)
    }
    const demarrer = () => {
      dimensionner()
      dessiner(performance.now())
      if (!raf && actif.current && !document.hidden && !reduit.matches)
        raf = requestAnimationFrame(boucle)
    }
    relancer.current = demarrer

    appliquerTheme()
    demarrer()
    canvas.dataset['pret'] = 'oui'

    const obsTheme = new MutationObserver(() => {
      appliquerTheme()
      dessiner(performance.now())
    })
    obsTheme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    const obsTaille = new ResizeObserver(demarrer)
    obsTaille.observe(canvas)
    document.addEventListener('visibilitychange', demarrer)
    reduit.addEventListener('change', demarrer)

    return () => {
      cancelAnimationFrame(raf)
      relancer.current = () => undefined
      obsTheme.disconnect()
      obsTaille.disconnect()
      document.removeEventListener('visibilitychange', demarrer)
      reduit.removeEventListener('change', demarrer)
      gl.deleteProgram(prog)
      gl.deleteBuffer(tampon)
    }
  }, [ref])

  return (
    <canvas ref={ref} aria-hidden="true" className={cx('soie-or block size-full', className)} />
  )
}
