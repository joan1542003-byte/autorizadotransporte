"""Normativa de Campañas de recolección: una página por norma, con lo que exige a una campaña de RAEE en simple, los artículos
que aplican tal como los publica la fuente oficial, preguntas frecuentes y datos estructurados (schema.org/Legislation).

Fuentes (copias en tools/cache/):
- DS 29/2024 Minsal y Ley 20.920: XML de Ley Chile (https://www.bcn.cl/leychile/Consulta/obtxml?opt=7&idNorma=...).
- DS 22/2025 MMA: Diario Oficial del 7 de mayo de 2026 (CVE 2805526), texto extraído del PDF con pdftotext -layout.
El formato de los artículos (párrafos, incisos y definiciones) es el de la biblioteca de normativa de Transporte Autorizado.

Usa preguntas.html como plantilla (cabecera, ficha flotante, pie y scripts) y reemplaza los datos de la página y el contenido.
Uso: python3 tools/normativa.py            genera normativa.html y las páginas de cada norma
     python3 tools/normativa.py --actualizar   vuelve a descargar el XML de Ley Chile y avisa si cambió
"""
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools' / 'cache'
DOMINIO = 'https://campanasdereciclaje.cl'
REVISADO = '2026-11-05'
REVISADO_TXT = '5 de noviembre de 2026'
NS = '{http://www.leychile.cl/esquemas}'
MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']


def esc(s):
    return html.escape(s or '', quote=True)


def fecha(iso):
    a, m, d = iso.split('-')
    return f'{int(d)} {MESES[int(m) - 1]} {a}'


def svg(paths, size=20, width=2):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>'


I_ESTADO = svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>')
I_FIRMA = svg('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>')
I_DIARIO = svg('<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/>')
I_EXTERNO = svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"/>', 18)
I_NORMA = svg('<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>', 20, 1.8)
I_FICHA = svg('<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>', 18)
I_PUNTO = svg('<path d="M20 6 9 17l-5-5"/>')
I_SIGUE = svg('<path d="m9 18 6-6-6-6"/>', 16)


# ---------- Texto oficial a HTML (mismas reglas que la biblioteca de Transporte Autorizado) ----------

LISTA = re.compile(r'^((?:[a-zñ]|[ivx]{1,4}|\d{1,3})(?:\)|\.-|\.–|°\)|\.(?=\s)|-(?=\s)))\s+(.*)$', re.I)
CONECTOR = re.compile(r'(,|\b(?:de|del|la|las|el|los|y|o|u|e|en|a|al|con|por|para|que|se|su|sus|un|una|como|sin|sobre|entre|desde|hasta|según|cuando|donde|cual|cuyo|cuya|lo|le|les|no|ni))$', re.I)
DEFINICION = re.compile(r'^([A-ZÁÉÍÓÚÑ][^:.;]{1,70}?):\s+(\S.*)$')
ARTICULO = re.compile(r'^(Art[íi]culo\s*\d+[°º]?)\s*(?:\.-|\.–|\.|:|-|–)?\s*', re.I)
EPIGRAFE = re.compile(r'^([A-ZÁÉÍÓÚÑ][^.:;]{1,95})\.\s+(?=[A-ZÁÉÍÓÚÑ"«(])')


def lineas(texto):
    """Líneas del texto oficial, sin vacías; une las que el original corta a mitad de frase."""
    ls = [re.sub(r'\s+', ' ', l).strip() for l in html.unescape(texto or '').replace('\r', '').split('\n')]
    out = []
    for l in ls:
        if not l:
            continue
        prev = out[-1] if out else ''
        if prev and not re.search(r'[.:;!?»"”)\]]$', prev) and not LISTA.match(l) and (l[0].islower() or CONECTOR.search(prev)):
            out[-1] = f'{prev} {l}'
        else:
            out.append(l)
    return out


def bloques(ls, definiciones=False):
    out = []
    for l in ls:
        m = LISTA.match(l)
        marca, resto = (m.group(1), m.group(2)) if m else ('', l)
        cuerpo = esc(resto)
        if definiciones:
            d = DEFINICION.match(resto)
            if d and len(d.group(1).split()) <= 9:
                cuerpo = f'<dfn>{esc(d.group(1))}:</dfn> {esc(d.group(2))}'
        out.append(f'<p class="norm-li"><span class="norm-li-m">{esc(marca)}</span><span>{cuerpo}</span></p>' if marca else f'<p>{cuerpo}</p>')
    return ''.join(out)


def articulo_html(ls, ancla, epigrafes):
    """Encabezado «Artículo N · Epígrafe» y el texto, con las definiciones destacadas si las hay."""
    ls = list(ls)
    m = ARTICULO.match(ls[0])
    etiqueta = re.sub(r'\s+', ' ', m.group(1)).replace('º', '°') if m else 'Artículo'
    ls[0] = ls[0][m.end():] if m else ls[0]
    epi = ''
    if epigrafes:
        e = EPIGRAFE.match(ls[0])
        if e and len(e.group(1).split()) <= 12:
            epi, ls[0] = e.group(1), ls[0][e.end():]
    ls = [l for l in ls if l]
    defs = sum(1 for l in ls if DEFINICION.match(LISTA.sub(r'\2', l))) >= 3
    cab = f'<h3 class="norm-art-h"><a href="#{ancla}">{esc(etiqueta)}</a>{f"<span>{esc(epi)}</span>" if epi else ""}</h3>'
    return cab + bloques(ls, defs)


def xml_articulos(slug):
    root = ET.parse(CACHE / f'{slug}.xml').getroot()
    arts = {}
    for ef in root.iter(f'{NS}EstructuraFuncional'):
        if ef.get('tipoParte') != 'Artículo':
            continue
        t = ef.findtext(f'{NS}Texto') or ''
        m = re.match(r'\s*Art[íi]culo\s+(\d+)', t)
        if m and int(m.group(1)) not in arts:  # los transitorios repiten números: vale el primero (permanente)
            arts[int(m.group(1))] = lineas(t)
    return arts


def diario_oficial_articulos(archivo):
    """Artículos del DS 22/2025 desde el PDF del Diario Oficial (pdftotext -layout), sin encabezados ni pies de página."""
    t = (CACHE / archivo).read_text(encoding='utf-8').replace('\f', '\n')
    basura = re.compile(r'^\s*(CVE \d+.*|Director: .*|Sitio Web: .*|Mesa Central: .*|Este documento ha sido.*|avanzada\. Para verificar.*|Dirección: Dr\. Torres Boonen.*|DIARIO OFICIAL DE LA REPUBLICA DE CHILE.*|Núm\. 44\.443.*|Jueves 7 de Mayo de 2026.*|Página \d+ de \d+.*|Diario Oficial.*|Ministerio del Interior.*|Sección I.*)\s*$', re.I)
    txt = '\n'.join(l for l in t.split('\n') if not basura.match(l))
    txt = txt[txt.index('TÍTULO I'):]
    arts = {}
    fin = r'(?=^\s*Artículo \d+°?\.|^\s*TÍTULO |^\s*Párrafo \d|^\s*DISPOSICIONES TRANSITORIAS|^\s*(?:Municipalidades|Recicladores de base|Disposiciones adicionales)\s*$|\Z)'
    for m in re.finditer(r'(?m)^\s*Artículo (\d+)°?\.(.*?)' + fin, txt, re.S):
        n = int(m.group(1))
        if n not in arts:
            arts[n] = lineas(f'Artículo {n}{"°" if n < 10 else ""}.' + m.group(2))
    return arts


def tabla_art32(html_art):
    """El artículo 32 del DS 22/2025 trae una tabla (plazo y porcentaje de viviendas): se muestra como tabla."""
    filas = [('Primer año', '10%'), ('Segundo año', '30%'), ('Tercer año', '50%'), ('Cuarto año', '70%'), ('A contar del quinto año', '80%')]
    plano = '<p>Plazo Porcentaje de las viviendas del país</p>' + ''.join(f'<p>{esc(a)} {esc(b)}</p>' for a, b in filas)
    assert plano in html_art, 'cambió la tabla del artículo 32'
    tabla = ('<div class="guia-matrix norm-tabla"><table><thead><tr><th scope="col">Plazo</th><th scope="col">Porcentaje de las viviendas del país</th></tr></thead><tbody>'
             + ''.join(f'<tr><td>{esc(a)}</td><td>{esc(b)}</td></tr>' for a, b in filas) + '</tbody></table></div>')
    return html_art.replace(plano, tabla)


# ---------- Contenido de cada norma ----------

LEY_CHILE = 'https://www.bcn.cl/leychile/navegar?idNorma='
DS22_PDF = 'https://www.diariooficial.interior.gob.cl/publicaciones/2026/05/07/44443/01/2805526.pdf'


def ref(pagina, art, texto=None):
    return f'<a class="law-ref" href="{pagina}#art-{art}">{texto or f"art. {art}"}</a>'


NORMAS = [
    {
        'slug': 'ds-29-2024-minsal',
        'corto': 'DS 29/2024',
        'nombre': 'Decreto 29 de 2024 del Ministerio de Salud',
        'oficial': 'Aprueba Reglamento Sanitario sobre labores de recepción y almacenamiento de residuos de productos prioritarios',
        'tipo': 'Decreto supremo', 'kind': 'Decreto · Ministerio de Salud', 'organismo': 'Ministerio de Salud',
        'titulo': 'DS 29/2024: qué exige a una campaña de recolección',
        'seo': 'DS 29/2024 Minsal: autorización sanitaria de campañas de recolección de RAEE',
        'lead': 'El reglamento sanitario que regula las campañas de recolección de residuos de productos prioritarios, como los aparatos eléctricos y electrónicos. Lo que pide, en simple, y sus artículos tal como los publica Ley Chile.',
        'desc': 'Qué exige el DS 29/2024 del Minsal a una campaña de recolección de RAEE: autorización sanitaria 40 días hábiles antes, plazos de la SEREMI, condiciones de los lugares y reporte en el RETC. Con los artículos oficiales.',
        'promulgada': '2024-07-22', 'publicada': '2026-01-14', 'vigente_desde': '2026-07-14',
        'estado': 'Vigente desde el 14 jul. 2026', 'estado_tip': f'Estado según Ley Chile al {REVISADO_TXT}; rige seis meses después de su publicación (art. 45)',
        'fuente': LEY_CHILE + '1220286', 'fuente_txt': 'Texto oficial en Ley Chile',
        'fuente_pie': f'Texto de Ley Chile (Biblioteca del Congreso Nacional), versión del 14 de enero de 2026, revisado el {REVISADO_TXT}.',
        'origen': ('xml', 'ds-29-2024-minsal'), 'epigrafes': False,
        'articulos': [
            (1, 'Objeto del reglamento'), (3, 'Definiciones (letra c: campaña de recolección)'), (7, 'Reporte en el RETC'),
            (24, 'Solicitud de autorización sanitaria'), (25, 'Campañas con residuos peligrosos'), (26, 'Lugares de recepción'),
            (39, 'Evaluación de la SEREMI'), (40, 'Observaciones y resolución'), (42, 'Notificaciones'), (45, 'Entrada en vigencia'),
        ],
        'simple': [
            ('Una campaña de recolección es un conjunto de actividades temporales y esporádicas cuyo único objeto es recibir o recoger residuos de productos prioritarios y enviarlos a un centro de acopio o a una instalación de valorización o eliminación.', [3]),
            ('Necesita autorización sanitaria de la SEREMI de Salud de la región donde se hará. La solicitud se presenta al menos 40 días hábiles antes del inicio, unos dos meses.', [24, 39]),
            ('La SEREMI revisa en 30 días hábiles y aprueba, rechaza u observa. Las observaciones se responden en 5 días hábiles, prorrogables una vez por otros 5, y luego resuelve en 30 días hábiles. Si no responde a tiempo, la solicitud se da por aprobada, salvo en campañas con residuos peligrosos.', [39, 40]),
            ('Durante la campaña, los lugares de recepción se limpian al final de cada jornada y tienen contenedores suficientes; los residuos van a un centro de acopio o a una instalación autorizada. Si se reciben residuos peligrosos, hay condiciones adicionales.', [26, 25]),
            ('Un mes después del término, el responsable informa en el RETC las cantidades recibidas de cada residuo y su destino.', [7]),
            ('Las notificaciones de la SEREMI llegan al correo electrónico indicado en la solicitud.', [42]),
        ],
        'faq': [
            ('¿Con cuánta anticipación se pide la autorización sanitaria de una campaña?', 'Al menos 40 días hábiles antes de la fecha de inicio, unos dos meses, ante la SEREMI de Salud de la región donde se hará la campaña (artículos 24 y 39).'),
            ('¿Qué pasa si la SEREMI no responde dentro del plazo?', 'La solicitud se da por aprobada, salvo que la campaña reciba residuos peligrosos: en ese caso el procedimiento termina con la resolución, y se puede pedir un certificado de que no se resolvió en plazo (artículo 40).'),
            ('¿Qué se informa cuando termina la campaña?', 'Un mes después del término, el responsable informa en el RETC las cantidades recibidas de cada tipo de residuo y la instalación de destino (artículo 7).'),
            ('¿Desde cuándo rige el DS 29/2024?', 'Se publicó en el Diario Oficial el 14 de enero de 2026 y rige seis meses después, desde el 14 de julio de 2026 (artículo 45).'),
        ],
    },
    {
        'slug': 'ds-22-2025-mma',
        'corto': 'DS 22/2025',
        'nombre': 'Decreto 22 de 2025 del Ministerio del Medio Ambiente',
        'oficial': 'Establece metas de recolección, valorización y otras obligaciones asociadas de pilas y aparatos eléctricos y electrónicos',
        'tipo': 'Decreto supremo', 'kind': 'Decreto · Ministerio del Medio Ambiente', 'organismo': 'Ministerio del Medio Ambiente',
        'titulo': 'DS 22/2025: metas de pilas y aparatos eléctricos',
        'seo': 'DS 22/2025 MMA: metas de RAEE y campañas de recolección domiciliaria',
        'lead': 'Fija las metas de la Ley REP para pilas y aparatos eléctricos y electrónicos, y las obligaciones de productores, sistemas de gestión, municipalidades y consumidores. Lo que significa para una campaña de RAEE, y sus artículos tal como los publicó el Diario Oficial.',
        'desc': 'Qué establece el DS 22/2025 del Ministerio del Medio Ambiente para los RAEE: metas de recolección, campañas de recolección domiciliaria de los GRANSIC, convenios con municipalidades y vigencia. Con los artículos oficiales.',
        'promulgada': '2025-07-17', 'publicada': '2026-05-07', 'vigente_desde': '2026-05-07',
        'estado': 'Vigente; metas desde el 7 may. 2028', 'estado_tip': 'Rige desde su publicación; los Títulos III (metas) y IV (obligaciones asociadas), 24 meses después (art. 49)',
        'fuente': DS22_PDF, 'fuente_txt': 'Texto oficial en el Diario Oficial',
        'fuente_pie': f'Texto del Diario Oficial de la República de Chile del 7 de mayo de 2026 (CVE 2805526), revisado el {REVISADO_TXT}.',
        'origen': ('diario', 'ds-22-2025-mma.txt'), 'epigrafes': True,
        'articulos': [
            (1, 'Objeto'), (3, 'Ámbito de aplicación'), (4, 'Categorías de AEE'), (32, 'Campañas de recolección domiciliaria'),
            (44, 'Municipalidades'), (46, 'Obligaciones de los consumidores'), (49, 'Entrada en vigencia'),
        ],
        'simple': [
            ('Aplica a las pilas y a los aparatos eléctricos y electrónicos (AEE) que se introducen en el mercado nacional, con algunas exclusiones, como las grandes instalaciones industriales fijas.', [3]),
            ('Los AEE se ordenan en tres categorías: aparatos de intercambio de temperatura, paneles fotovoltaicos y otros aparatos eléctricos y electrónicos.', [4]),
            ('Los grandes sistemas colectivos de gestión (GRANSIC) deberán hacer campañas de recolección domiciliaria al menos dos veces al año, para recibir pilas y AEE de cualquier categoría, cubriendo desde el 10% de las viviendas del país el primer año hasta el 80% desde el quinto.', [32]),
            ('Los sistemas de gestión pueden convenir con municipalidades la recolección domiciliaria, instalaciones de recepción y acciones de educación. La municipalidad puede hacerlo directamente o a través de terceros, con licitación abierta.', [44]),
            ('Todo consumidor debe entregar sus residuos de pilas y AEE a un sistema de gestión, a través de los mecanismos que este ofrezca.', [46]),
            ('Rige desde su publicación, el 7 de mayo de 2026; las metas y las obligaciones asociadas, como las campañas domiciliarias, desde el 7 de mayo de 2028. Cada campaña, además, necesita la autorización sanitaria del DS 29/2024.', [49]),
        ],
        'faq': [
            ('¿Desde cuándo rigen las metas de recolección de RAEE?', 'El decreto se publicó el 7 de mayo de 2026 y rige desde esa fecha, pero sus Títulos III (metas) y IV (obligaciones asociadas) rigen 24 meses después, desde el 7 de mayo de 2028 (artículo 49).'),
            ('¿Qué es un GRANSIC?', 'Un gran sistema colectivo de gestión: un sistema colectivo integrado por 20 o más productores no relacionados, constituido para cumplir las obligaciones del decreto (artículo 2). Deberá hacer campañas de recolección domiciliaria al menos dos veces al año (artículo 32).'),
            ('¿Una municipalidad puede organizar la recolección con un sistema de gestión?', 'Sí. Los sistemas de gestión pueden convenir con municipalidades la recolección domiciliaria, instalaciones de recepción y acciones de educación; la municipalidad puede ejecutarlas directamente o a través de terceros, con licitación abierta (artículo 44).'),
        ],
    },
    {
        'slug': 'ley-20920',
        'corto': 'Ley 20.920',
        'nombre': 'Ley 20.920, Ley REP',
        'oficial': 'Establece marco para la gestión de residuos, la responsabilidad extendida del productor y fomento al reciclaje',
        'tipo': 'Ley', 'kind': 'Ley · Ministerio del Medio Ambiente', 'organismo': 'Ministerio del Medio Ambiente',
        'titulo': 'Ley 20.920 (Ley REP): lo que importa para una campaña de RAEE',
        'seo': 'Ley REP 20.920: qué significa para las campañas de recolección de RAEE',
        'lead': 'La ley marco de gestión de residuos y responsabilidad extendida del productor. Define los productos prioritarios, entre ellos los aparatos eléctricos y electrónicos, y el rol de municipalidades, sistemas de gestión y consumidores. Lo que importa para una campaña, y sus artículos tal como los publica Ley Chile.',
        'desc': 'Qué dice la Ley 20.920 (Ley REP) que importa para una campaña de recolección de RAEE: productos prioritarios, gestores autorizados, municipalidades, consumidores y autorización sanitaria. Con los artículos oficiales.',
        'promulgada': '2016-05-17', 'publicada': '2016-06-01', 'vigente_desde': '2016-06-01',
        'estado': 'Vigente', 'estado_tip': f'Estado según Ley Chile al {REVISADO_TXT}',
        'fuente': LEY_CHILE + '1090894', 'fuente_txt': 'Texto oficial en Ley Chile',
        'fuente_pie': f'Texto de Ley Chile (Biblioteca del Congreso Nacional), versión del 1 de junio de 2016, revisado el {REVISADO_TXT}.',
        'origen': ('xml', 'ley-20920'), 'epigrafes': True,
        'articulos': [
            (1, 'Objeto'), (5, 'Obligaciones de los generadores de residuos'), (10, 'Productos prioritarios'),
            (23, 'Permiso municipal para usar bienes nacionales de uso público'), (25, 'Convenios con municipalidades'),
            (30, 'Municipalidades'), (34, 'Obligaciones de los consumidores'), (35, 'Autorización sanitaria'),
        ],
        'simple': [
            ('Busca disminuir la generación de residuos y fomentar su reutilización, reciclaje y otras formas de valorización, mediante la responsabilidad extendida del productor (REP).', [1]),
            ('Los aparatos eléctricos y electrónicos y las pilas son productos prioritarios: sus productores deben hacerse cargo de los residuos según las metas que fija cada decreto, como el DS 22/2025.', [10]),
            ('Quien genera residuos debe entregarlos a un gestor autorizado; los consumidores deben entregar los residuos de productos prioritarios al sistema de gestión respectivo.', [5, 34]),
            ('Las municipalidades pueden celebrar convenios con sistemas de gestión y con recicladores de base, otorgar permisos para usar plazas, veredas y parques, y promover la educación ambiental.', [23, 25, 30]),
            ('La autorización sanitaria de la recolección y de las instalaciones de recepción se rige por un reglamento con un procedimiento simplificado: el DS 29/2024.', [35]),
        ],
        'faq': [
            ('¿Los aparatos eléctricos y electrónicos están en la Ley REP?', 'Sí. Los aparatos eléctricos y electrónicos y las pilas están entre los productos prioritarios de la Ley 20.920 (artículo 10); sus metas las fija el DS 22/2025.'),
            ('¿Qué pueden hacer las municipalidades según la Ley REP?', 'Celebrar convenios con sistemas de gestión y recicladores de base, pronunciarse sobre permisos para instalaciones en bienes nacionales de uso público, incorporar la separación en origen en sus ordenanzas cuando lo determine el decreto, y promover la educación ambiental (artículo 30).'),
            ('¿Dónde se regula la autorización sanitaria de una campaña?', 'La Ley 20.920 encarga a un reglamento el procedimiento simplificado de autorización sanitaria (artículo 35). Ese reglamento es el DS 29/2024 del Ministerio de Salud.'),
        ],
    },
]


def articulos_de(n):
    tipo, archivo = n['origen']
    fuente = xml_articulos(archivo) if tipo == 'xml' else diario_oficial_articulos(archivo)
    out = []
    for num, nota in n['articulos']:
        h = articulo_html(fuente[num], f'art-{num}', n['epigrafes'])
        if n['slug'] == 'ds-22-2025-mma' and num == 32:
            h = tabla_art32(h)
        out.append((num, nota, h))
    return out


# ---------- Plantilla (preguntas.html) ----------

def plantilla():
    return (ROOT / 'preguntas.html').read_text(encoding='utf-8')


def con_cabeza(base, titulo, desc, url, ld):
    s = base
    s = re.sub(r'<title>.*?</title>', f'<title>{esc(titulo)}</title>', s, count=1)
    for patron, valor in [(r'(<meta name="description" content=")[^"]*', desc), (r'(<meta property="og:title" content=")[^"]*', titulo),
                          (r'(<meta property="og:description" content=")[^"]*', desc), (r'(<meta property="og:url" content=")[^"]*', url),
                          (r'(<meta name="twitter:title" content=")[^"]*', titulo), (r'(<meta name="twitter:description" content=")[^"]*', desc),
                          (r'(<link rel="canonical" href=")[^"]*', url), (r'(<link rel="alternate" hreflang="es-CL" href=")[^"]*', url)]:
        s, k = re.subn(patron, lambda m: m.group(1) + esc(valor), s, count=1)
        assert k == 1, patron
    s = s.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">')
    s = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=2) + '\n</script>', s, count=1, flags=re.S)
    return s


def con_cuerpo(base, main, actual):
    s = re.sub(r'<main id="contenido">.*?</main>', lambda m: f'<main id="contenido">\n{main}\n</main>', base, count=1, flags=re.S)
    s = s.replace('<a href="preguntas.html" aria-current="page">Preguntas</a>', '<a href="preguntas.html">Preguntas</a>')
    s = s.replace(f'<a href="{actual}">Normativa</a>', f'<a href="{actual}" aria-current="page">Normativa</a>')
    return s


def ld_base(base):
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', base, re.S)
    g = json.loads(m.group(1))['@graph']
    return [x for x in g if x.get('@type') in ('Organization', 'WebSite')]


def migas(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def legislacion(n):
    url = f'{DOMINIO}/{n["slug"]}.html'
    return {
        '@type': 'Legislation', '@id': f'{url}#norma', 'name': n['oficial'], 'alternateName': [n['corto'], n['nombre']],
        'legislationIdentifier': n['corto'], 'legislationType': n['tipo'], 'legislationJurisdiction': 'CL', 'inLanguage': 'es',
        'legislationDate': n['promulgada'], 'datePublished': n['publicada'], 'legislationLegalForce': 'https://schema.org/InForce',
        'legislationPassedBy': {'@type': 'GovernmentOrganization', 'name': n['organismo']},
        'url': n['fuente'], 'sameAs': n['fuente'],
    }


def crumbs(items):
    partes = []
    for nombre, href in items[:-1]:
        partes.append(f'<a href="{href}">{esc(nombre)}</a><span aria-hidden="true">/</span>')
    partes.append(f'<span aria-current="page">{esc(items[-1][0])}</span>')
    return f'<nav class="norm-crumbs" aria-label="Ruta">{"".join(partes)}</nav>'


def faq_html(faq, h_id='preguntas-norma'):
    items = ''.join(f'<details><summary>{esc(q)}<span class="plus" aria-hidden="true"></span></summary><div class="answer"><p>{esc(a)}</p></div></details>' for q, a in faq)
    return f'<section class="guia-sec" aria-labelledby="{h_id}"><h2 id="{h_id}">Preguntas frecuentes</h2><div class="accordion">{items}</div></section>'


def pagina_norma(n, base):
    url = f'{DOMINIO}/{n["slug"]}.html'
    arts = articulos_de(n)
    puntos = ''.join(
        f'<li>{I_PUNTO}<span>{esc(t)}<span class="law-refs">{"".join(ref("", a, f"{n["corto"]}, art. {a}") for a in refs)}</span></span></li>'
        for t, refs in n['simple'])
    toc = ''.join(f'<li><a href="#art-{num}"><small>Artículo {num}</small><span>{esc(nota)}</span></a></li>' for num, nota, _ in arts)
    cuerpo_arts = ''.join(f'<article class="norm-art" id="art-{num}">{h}</article>' for num, _, h in arts)
    otras = ''.join(
        f'<li><a href="{o["slug"]}.html"><span class="doc-icon">{I_NORMA}</span><span><strong>{esc(o["corto"])} · {esc(o["titulo"].split(": ", 1)[-1])}</strong><small>{esc(o["kind"])}</small></span>{I_SIGUE}</a></li>'
        for o in NORMAS if o is not n)
    main = f'''  <article class="container norm">
    {crumbs([('Inicio', './'), ('Normativa', 'normativa.html'), (n['corto'], '')])}
    <header class="norm-head">
      <p class="norm-kind"><span class="doc-icon">{I_NORMA}</span>{esc(n['kind'])}</p>
      <h1 class="norm-title">{esc(n['titulo'])}</h1>
      <p class="norm-lead">{esc(n['lead'])}</p>
      <ul class="norm-facts" data-tips>
        <li class="norm-state" data-tip="{esc(n['estado_tip'])}">{I_ESTADO}{esc(n['estado'])}</li>
        <li data-tip="Fecha en que se firmó">{I_FIRMA}<span class="fact"><span class="fact-l">Promulgad{'a' if n['tipo'] == 'Ley' else 'o'}<span class="lg"> el</span></span> <time datetime="{n['promulgada']}">{fecha(n['promulgada'])}</time></span></li>
        <li data-tip="Fecha de publicación en el Diario Oficial">{I_DIARIO}<span class="fact"><span class="fact-l">Publicad{'a' if n['tipo'] == 'Ley' else 'o'}<span class="lg"> el</span></span> <time datetime="{n['publicada']}">{fecha(n['publicada'])}</time></span></li>
      </ul>
      <div class="norm-actions">
        <a class="btn btn-ink btn-small" href="{n['fuente']}" target="_blank" rel="noopener noreferrer">{I_EXTERNO}<span>{esc(n['fuente_txt']).replace(' en ', '<span class="lg"> en ', 1)}</span></span></a>
        <button class="btn btn-quiet btn-small" type="button" data-dock-open="contacto">{I_FICHA}<span>Organizar<span class="lg"> una campaña</span></span></button>
      </div>
    </header>
    <section class="guia-sec norm-simple" aria-labelledby="en-simple"><h2 id="en-simple">En simple</h2><ul class="guia-points">{puntos}</ul></section>
    <div class="norm-layout">
      <nav class="norm-toc" aria-label="Artículos"><p class="norm-toc-h">Artículos</p><ol>{toc}</ol></nav>
      <section class="norm-text" aria-labelledby="articulos">
        <h2 id="articulos" class="norm-part">Artículos que aplican a una campaña</h2>
        <p class="norm-nota">Tal como los publica la fuente oficial. Solo los artículos que tocan una campaña de RAEE; el texto completo está en {esc(n['fuente_txt'].replace('Texto oficial en ', ''))}.</p>
        {cuerpo_arts}
      </section>
    </div>
    {faq_html(n['faq'])}
    <section class="guia-sec" aria-labelledby="otras-normas"><h2 id="otras-normas">Otras normas de las campañas de RAEE</h2><ul class="guia-links">{otras}</ul></section>
    <footer class="norm-source">
      <p>{esc(n['fuente_pie'])} Orientación general: ante cualquier diferencia prevalece el texto oficial, y el alcance de cada campaña se define en su propuesta.</p>
      <a class="text-link" href="{n['fuente']}" target="_blank" rel="noopener noreferrer">{esc(n['fuente_txt'])}</a>
    </footer>
  </article>'''
    ld = {'@context': 'https://schema.org', '@graph': ld_base(base) + [
        legislacion(n),
        {'@type': 'WebPage', '@id': f'{url}#webpage', 'url': url, 'name': n['seo'], 'description': n['desc'], 'inLanguage': 'es-CL',
         'isPartOf': {'@id': f'{DOMINIO}/#website'}, 'about': {'@id': f'{url}#norma'}, 'dateModified': REVISADO,
         'breadcrumb': {'@id': f'{url}#ruta'}, 'citation': n['fuente']},
        dict(migas([('Inicio', f'{DOMINIO}/'), ('Normativa', f'{DOMINIO}/normativa.html'), (n['corto'], url)]), **{'@id': f'{url}#ruta'}),
        {'@type': 'FAQPage', '@id': f'{url}#faq', 'about': {'@id': f'{url}#norma'},
         'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in n['faq']]},
    ]}
    s = con_cabeza(base, f'{n["seo"]} | Campañas de recolección', n['desc'], url, ld)
    return con_cuerpo(s, main, 'normativa.html')  # en el menú, las normas son parte de «Normativa»


def pagina_indice(base):
    url = f'{DOMINIO}/normativa.html'
    titulo = 'Normativa de las campañas de recolección de RAEE en Chile'
    desc = 'Las normas que rigen una campaña de recolección de aparatos eléctricos y electrónicos en Chile: Ley REP 20.920, DS 22/2025 MMA y DS 29/2024 Minsal, explicadas en simple y con sus artículos oficiales.'
    lista = ''.join(
        f'<li><a href="{n["slug"]}.html"><span class="doc-icon">{I_NORMA}</span><span><strong>{esc(n["corto"])} · {esc(n["titulo"].split(": ", 1)[-1])}</strong><small>{esc(n["kind"])}. {esc(n["estado"])}.</small></span>{I_SIGUE}</a></li>'
        for n in NORMAS)
    relacion = [
        ('La Ley 20.920 (Ley REP) es la ley marco: define los productos prioritarios, entre ellos los aparatos eléctricos y electrónicos, y el rol de municipalidades, sistemas de gestión y consumidores.', 'ley-20920.html', 'Ley 20.920'),
        ('El DS 22/2025 del Ministerio del Medio Ambiente fija las metas de recolección y valorización de pilas y aparatos eléctricos y electrónicos, y las campañas de recolección domiciliaria de los grandes sistemas de gestión.', 'ds-22-2025-mma.html', 'DS 22/2025'),
        ('El DS 29/2024 del Ministerio de Salud regula la autorización sanitaria de cada campaña: se pide a la SEREMI de Salud al menos 40 días hábiles antes del inicio.', 'ds-29-2024-minsal.html', 'DS 29/2024'),
    ]
    puntos = ''.join(f'<li>{I_PUNTO}<span>{esc(t)}<span class="law-refs"><a class="law-ref" href="{h}">{esc(c)}</a></span></span></li>' for t, h, c in relacion)
    faq = [
        ('¿Qué normas rigen una campaña de recolección de RAEE en Chile?', 'La Ley 20.920 (Ley REP), que define los aparatos eléctricos y electrónicos como producto prioritario; el DS 22/2025 del Ministerio del Medio Ambiente, que fija sus metas; y el DS 29/2024 del Ministerio de Salud, que regula la autorización sanitaria de cada campaña.'),
        ('¿Una campaña de recolección necesita autorización sanitaria?', 'Sí. Según el DS 29/2024, la solicitud se presenta a la SEREMI de Salud de la región al menos 40 días hábiles antes del inicio, unos dos meses.'),
    ]
    main = f'''  <article class="container guia">
    {crumbs([('Inicio', './'), ('Normativa', '')])}
    <header class="guia-head">
      <p class="norm-kind"><span class="doc-icon">{I_NORMA}</span>Normativa</p>
      <h1 class="norm-title">Normativa de las campañas de recolección de RAEE</h1>
      <p class="norm-lead">Las tres normas que rigen una campaña de recolección de aparatos eléctricos y electrónicos en Chile, explicadas en simple y con sus artículos oficiales.</p>
    </header>
    <section class="guia-sec" aria-labelledby="normas-campana"><h2 id="normas-campana">Las normas</h2><ul class="guia-links">{lista}</ul></section>
    <section class="guia-sec" aria-labelledby="como-se-relacionan"><h2 id="como-se-relacionan">Cómo se relacionan</h2><ul class="guia-points">{puntos}</ul></section>
    {faq_html(faq, 'preguntas-normativa')}
    <footer class="norm-source">
      <p>Textos de Ley Chile (Biblioteca del Congreso Nacional) y del Diario Oficial, revisados el {REVISADO_TXT}. Orientación general: ante cualquier diferencia prevalece el texto oficial.</p>
    </footer>
  </article>'''
    ld = {'@context': 'https://schema.org', '@graph': ld_base(base) + [
        {'@type': 'CollectionPage', '@id': f'{url}#webpage', 'url': url, 'name': titulo, 'description': desc, 'inLanguage': 'es-CL',
         'isPartOf': {'@id': f'{DOMINIO}/#website'}, 'dateModified': REVISADO, 'breadcrumb': {'@id': f'{url}#ruta'},
         'hasPart': [{'@id': f'{DOMINIO}/{n["slug"]}.html#norma'} for n in NORMAS],
         'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f'{DOMINIO}/{n["slug"]}.html', 'name': n['corto']} for i, n in enumerate(NORMAS)]}},
        dict(migas([('Inicio', f'{DOMINIO}/'), ('Normativa', url)]), **{'@id': f'{url}#ruta'}),
        {'@type': 'FAQPage', '@id': f'{url}#faq', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]},
    ] + [legislacion(n) for n in NORMAS]}
    s = con_cabeza(base, f'{titulo} | Campañas de recolección', desc, url, ld)
    return con_cuerpo(s, main, 'normativa.html')


def actualizar():
    for slug, id_norma in [('ds-29-2024-minsal', '1220286'), ('ley-20920', '1090894')]:
        req = urllib.request.Request(f'https://www.bcn.cl/leychile/Consulta/obtxml?opt=7&idNorma={id_norma}', headers={'User-Agent': 'Mozilla/5.0'})
        nuevo = urllib.request.urlopen(req, timeout=90).read()
        viejo = (CACHE / f'{slug}.xml').read_bytes()
        print(slug, 'sin cambios' if nuevo == viejo else 'CAMBIÓ: revisa el texto antes de publicar')
        (CACHE / f'{slug}.xml').write_bytes(nuevo)


def main():
    if '--actualizar' in sys.argv:
        actualizar()
    base = plantilla()
    for n in NORMAS:
        (ROOT / f'{n["slug"]}.html').write_text(pagina_norma(n, base), encoding='utf-8')
        print('ok', n['slug'])
    (ROOT / 'normativa.html').write_text(pagina_indice(base), encoding='utf-8')
    print('ok normativa')


if __name__ == '__main__':
    main()
