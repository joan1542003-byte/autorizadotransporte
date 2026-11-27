#!/usr/bin/env python3
"""Esquinas continuas más marcadas (26-11-2026).

Con corner-shape: squircle la esquina se ve menos redonda que con el mismo radio normal. Para que el squircle se note,
este script lee todas las reglas con border-radius de las hojas que carga Campañas (site.css, transporte.css y
campanas.css), en su orden, y escribe al final de campanas.css las mismas reglas (mismos selectores, mismas @media) con
los radios entre 6 y 30 px multiplicados por FACTOR, dentro de @supports (corner-shape: squircle). Como los selectores
son los mismos y van después, la cascada se resuelve igual que antes; solo cambian los números. Las cápsulas y los
círculos (radios grandes o en %) quedan tal cual. Sin soporte de corner-shape, nada cambia.

    python3 tools/squircle.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOJAS = ['assets/site/site.css', 'assets/site/transporte.css', 'assets/campanas/campanas.css']
FACTOR = 1.5
INI, FIN = '/* squircle:inicio (generado por tools/squircle.py; no editar a mano) */', '/* squircle:fin */'
# Esquinas concéntricas: lo que va a pocos px de la esquina de su contenedor sigue la misma curva (radio de adentro =
# radio de afuera − separación). Si el de adentro es una cápsula (su radio ya es la mitad de su alto), manda él y el
# contenedor se ajusta. Medido con la prueba de esquinas (concentricos.mjs).
AJUSTES = """
/* Burbuja «?» abierta: opciones de 48 px a 8 px del borde (24 + 8 = 32); abajo a la derecha, el botón redondo de 56 px
   va al ras: esa esquina es la del círculo (28 px, redonda) */
body[data-site="campanas"] .dock.is-open { border-radius: 32px 32px 28px 32px; corner-shape: squircle squircle round squircle; }
body[data-site="campanas"] .dock-action { border-radius: 24px; }
body[data-site="campanas"] .dock-action.is-ia::before { border-radius: 25px; }
/* Hero en el teléfono: el bloque de opciones va a 12 px del borde de la foto (33 − 12 = 21) */
@media (max-width: 860px) {
  body[data-site="campanas"] .stage .routes { border-radius: 21px; }
  /* La píldora que marca la opción y cada opción van a 4 px de su borde (21 − 4 = 17) */
  body[data-site="campanas"] .stage :is(.routes-pill, .route) { border-radius: 17px; }
}
"""
PROP = re.compile(r'(border(?:-(?:top|bottom)-(?:left|right))?-radius)\s*:\s*([^;}]+)')


def escala(valor):
    def px(m):
        n = float(m.group(1))
        return f'{round(n * FACTOR)}px' if 6 <= n <= 30 else m.group(0)
    return re.sub(r'(?<![\w.-])(\d+(?:\.\d+)?)px', px, valor)


def reglas(css):
    """(contexto de @media, selector, declaraciones de radio) en orden; ignora @keyframes y @font-face."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, pila, i, buf = [], [], 0, ''
    while i < len(css):
        c = css[i]
        if c == '{':
            cabeza = buf.strip(); buf = ''
            pila.append(cabeza)
        elif c == '}':
            if pila:
                cabeza = pila.pop()
                if buf.strip() and not cabeza.startswith('@') and not any(p.startswith(('@keyframes', '@font-face', '@-webkit-keyframes')) for p in pila):
                    decl = [(m.group(1), m.group(2).strip()) for m in PROP.finditer(buf)]
                    if decl:
                        ctx = tuple(p for p in pila if p.startswith(('@media', '@supports', '@container')))
                        out.append((ctx, cabeza, decl))
            buf = ''
        else:
            buf += c
        i += 1
    return out


def main():
    campanas = ROOT / HOJAS[-1]
    texto = campanas.read_text(encoding='utf-8')
    if INI in texto:  # lo que se haya agregado después del bloque se conserva (el bloque vuelve al final)
        texto = (texto[:texto.index(INI)].rstrip() + '\n' + texto[texto.index(FIN) + len(FIN):].strip() + '\n').rstrip() + '\n'
    bloques = []
    for hoja in HOJAS:
        css = texto if hoja == HOJAS[-1] else (ROOT / hoja).read_text(encoding='utf-8')
        for ctx, sel, decl in reglas(css):
            nuevas = [(p, escala(v)) for p, v in decl]
            # También las que no cambian (cápsulas, círculos, variables): así se conserva el orden de la cascada
            cuerpo = '; '.join(f'{p}: {v}' for p, v in nuevas)
            regla = f'{sel} {{ {cuerpo}; }}'
            for c in reversed(ctx):
                regla = f'{c} {{ {regla} }}'
            bloques.append(regla)
    # Los radios que usan las variables --r-s, --r-m y --r-l (tokens del sistema de diseño)
    tokens = sorted(set(re.findall(r'(--r-[a-z]+)\s*:\s*(\d+px)', ''.join((ROOT / h).read_text(encoding='utf-8') for h in HOJAS[:-1]))))
    raiz = ':root { ' + ' '.join(f'{k}: {escala(v)};' for k, v in tokens) + ' }'
    texto += f'\n{INI}\n@supports (corner-shape: squircle) {{\n{raiz}\n' + '\n'.join(bloques) + '\n' + AJUSTES.strip() + f'\n}}\n{FIN}\n'
    campanas.write_text(texto, encoding='utf-8')
    print(f'ok squircle: {len(bloques)} reglas')


if __name__ == '__main__':
    main()
