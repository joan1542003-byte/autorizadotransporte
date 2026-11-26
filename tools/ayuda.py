#!/usr/bin/env python3
"""Ayuda de Campañas de recolección: el panel «Ayuda» de la cabecera, tres guías y un checklist por etapa.

Mismo diseño y tipo de menú que la ayuda de Transporte Autorizado (pedido del cliente, 13-11-2026): el panel se abre
dentro de la cabecera con sus temas; cada guía y cada checklist es una página propia (en la raíz, como las normas).
Contenido: «Guía rápida y checklist» del cliente (cuatro etapas con preguntas Sí / No / No sé), revisado contra el
DS 29/2024 (arts. 3 c, 7, 8, 24, 25, 26, 39 y 40) y el DS 22/2025 (arts. 2 y 4). El procedimiento interno de campaña
municipal solo orienta el paso a paso: no se publican dotaciones ni responsables internos.

Uso: python3 tools/ayuda.py  (actualiza el panel en index.html, preguntas.html y creditos.html, escribe las páginas
de ayuda, sitemap.xml y llms.txt, y vuelve a generar las normas con tools/normativa.py, que copia la cabecera).
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import normativa as N  # noqa: E402

ROOT = N.ROOT
DOMINIO = N.DOMINIO
REVISADO = '2026-11-13'
REVISADO_TXT = '13 de noviembre de 2026'
esc = N.esc
DS29 = 'ds-29-2024-minsal.html'
DS22 = 'ds-22-2025-mma.html'


def ico(paths, size=20, width=2):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>')


# Íconos de Lucide (ISC, assets/site/LICENCIA-LUCIDE.txt)
I = {
    'buscar': ico('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>', 18),
    'pasos': ico('<path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>'),
    'tamano': ico('<path d="M21 3 9 15"/><path d="M12 3H3v18h18v-9"/><path d="M16 3h5v5"/><path d="M14 15H9v-5"/>'),
    'autorizacion': ico('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    'lista': ico('<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>'),
    'normativa': ico('<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>'),
    'abajo': ico('<path d="m6 9 6 6 6-6"/>', 16),
    'flecha': ico('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 16),
    'volver': ico('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 18),
    'conversar': ico('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', 18),
    'ficha': ico('<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>', 18),
    'punto': ico('<path d="M20 6 9 17l-5-5"/>', 18, 2.2),
    'imprimir': ico('<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>', 18),
    'guia': ico('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>', 18),
    'idea': ico('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>', 18),
    'borrar': ico('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', 16),
}


# Espacios que no se cortan entre un número y su unidad, y en «art. 24» o «DS 29/2024» (Vercel Web Interface Guidelines)
UNIDAD = r'(?:cm|kg|m²|m|t|días|toneladas|tonelada|litros|meses|mes|preguntas)(?![\w²])'


def nbsp(html):
    partes = re.split(r'(<[^>]+>)', html)
    for i, t in enumerate(partes):
        if t.startswith('<'):
            continue
        t = re.sub(r'(\d) (?=' + UNIDAD + ')', '\\1\u00a0', t)
        t = re.sub(r'\b(art\.|arts\.|n\.°|DS|Ley) (?=\d)', '\\1\u00a0', t)
        partes[i] = t
    return ''.join(partes)


def r29(art, letra=''):
    """Cita al DS 29/2024 en el sitio (artículo con su letra, si la tiene)."""
    return (DS29, art, f'DS 29/2024, art. {art}{" " + letra if letra else ""}')


def r22(art, letra=''):
    return (DS22, art, f'DS 22/2025, art. {art}{" " + letra if letra else ""}')


def refs_html(refs):
    return f'<span class="law-refs">{"".join(N.ref(p, a, t) for p, a, t in refs)}</span>' if refs else ''


# ---------- Checklists: uno por etapa (guía rápida del cliente, revisada contra el DS 29/2024) ----------
# Cada pregunta: (texto, citas, qué hacer si responde «No», qué hacer si responde «No sé» o None = lo mismo, enlaces)
CHECKLISTS = [
    {
        'slug': 'checklist-planificacion', 'etapa': 1, 'nombre': 'Planificación', 'titulo': 'Checklist de planificación',
        'lema': 'Define el alcance de tu campaña',
        'intro': 'Una campaña de recolección es una actividad temporal y esporádica. Antes de anunciarla, define qué aparatos se recibirán, quién será responsable y cómo llegarán los residuos a su destino.',
        'datos': [('Alcance', 'Temporal y esporádico'), ('Lugar y fecha', 'Punto y calendario definidos'), ('Destino', 'Salida de residuos prevista')],
        'resultado': 'una planificación inicial con alcance, responsables, cronograma y destino propuesto.',
        'preguntas': [
            ('¿La actividad será temporal y esporádica, y no un punto permanente de recepción?', [r29(3, 'c')],
             'Si el punto quedará instalado de forma permanente, no es una campaña: es una instalación de recepción y almacenamiento (un punto verde o un punto limpio), que requiere su propia autorización sanitaria. Conversemos tu caso.',
             'Una campaña tiene fecha de inicio y de término, y su único objetivo es recibir aparatos para enviarlos a un centro de acopio o a una instalación de valorización o eliminación.',
             [('conversar', 'Conversar tu caso')]),
            ('¿Está identificada la persona o entidad responsable y su equipo de apoyo?', [r29(24, 'a')],
             'Define quién será responsable de la campaña: la solicitud sanitaria pide su nombre, domicilio y correo, y los de su representante legal si corresponde. Suma una contraparte para el lugar y la difusión.', None, []),
            ('¿Se definieron los tipos de RAEE aceptados y las cantidades estimadas?', [r29(24, 'b')],
             'Haz un listado de los aparatos que recibirás y estima cuánto llegará de cada uno: la solicitud lo pide. Si no sabes por dónde partir, indícalo en la ficha y lo precisamos en la reunión.', None,
             [('tamano-de-los-aparatos.html', 'Qué es un aparato pequeño'), ('contacto', 'Abrir la ficha')]),
            ('¿Están establecidos el lugar, las fechas y los horarios de atención?', [r29(24, 'd')],
             'El cronograma con lugares, fechas y horarios es parte de la solicitud. Ten en cuenta que se presenta al menos 40 días hábiles antes del inicio: cerca de dos meses.', None, []),
            ('¿Se cuenta o se gestionará el permiso de uso del lugar, cuando corresponda?', [r29(24, 'g')],
             'Si el punto estará en un espacio municipal, de otro organismo del Estado, de un privado o en un establecimiento de acceso público, necesitas un convenio, acuerdo, autorización o contrato que permita instalarlo.', None, []),
            ('¿Se definieron contenedores, equipos y forma de recepción para cada residuo?', [r29(24, 'c'), r29(24, 'e')],
             'Describe los contenedores y equipos (tipo, material y dimensiones) y cómo recibirás cada tipo de aparato. El tamaño de los aparatos ayuda a definir cuántos contenedores y qué espacio necesitas.', None,
             [('tamano-de-los-aparatos.html', 'Tamaño de los aparatos')]),
            ('¿Se identificaron vehículos y centro de acopio o instalación de destino?', [r29(24, 'i'), r29(24, 'j'), r29(26)],
             'Antes de recibir aparatos debe estar definido a dónde irán: un centro de acopio o una instalación de valorización o eliminación autorizada, y qué vehículos los trasladarán.', None, []),
            ('¿Tienes prevista la autorización sanitaria de la campaña?', [r29(24)],
             'Toda campaña de recolección necesita autorización sanitaria de la SEREMI de Salud, pedida al menos 40 días hábiles antes del inicio. Te explicamos cómo obtenerla, paso a paso.', None,
             [('autorizacion-sanitaria.html', 'Cómo obtener la autorización'), ('checklist-autorizacion-sanitaria.html', 'Checklist de autorización sanitaria')]),
        ],
    },
    {
        'slug': 'checklist-autorizacion-sanitaria', 'etapa': 2, 'nombre': 'Autorización sanitaria', 'titulo': 'Checklist de autorización sanitaria',
        'lema': 'Prepara la solicitud con anticipación',
        'intro': 'La solicitud ante la SEREMI de Salud describe la campaña y reúne los antecedentes del artículo 24 del DS 29/2024. Presentarla a tiempo permite que la autoridad la revise y, si corresponde, formule observaciones.',
        'datos': [('40 días hábiles', 'Anticipación mínima'), ('30 días hábiles', 'Revisión inicial'), ('5 días hábiles', 'Subsanación, prorrogable una vez')],
        'resultado': 'la solicitud preparada e ingresada, con seguimiento de su evaluación y observaciones.',
        'preguntas': [
            ('¿Se identificó al responsable de la campaña y a su representante legal, si corresponde?', [r29(24, 'a')],
             'Reúne nombre, domicilio y correo electrónico del responsable de la campaña y de su representante legal, si corresponde.', None, []),
            ('¿Se preparó el listado de RAEE, cantidades, equipos, contenedores y cronograma?', [r29(24, 'b'), r29(24, 'c'), r29(24, 'd'), r29(24, 'e')],
             'La solicitud pide el listado de residuos con su cantidad estimada, los equipos y contenedores con tipo, material y dimensiones, el cronograma con lugares, fechas y horarios, y las actividades para cada residuo.', None, []),
            ('¿Está lista la información a la población sobre entrega segura, riesgos y destino?', [r29(24, 'f')],
             'Prepara la información para las personas: cómo entregar los aparatos, recomendaciones para su manejo seguro y sus riesgos, su destino y cómo prevenir estos residuos.', None, []),
            ('¿Se dispone de convenio, acuerdo o autorización del lugar, cuando corresponda?', [r29(24, 'g')],
             'Si el punto estará en un espacio municipal, de otro organismo del Estado, de un privado o en un establecimiento de acceso público, adjunta el convenio, acuerdo, autorización o contrato que permite instalarlo.', None, []),
            ('¿Existe un plan de contingencia con eventos, medidas, responsables y comunicación?', [r29(24, 'h')],
             'El plan identifica y prioriza los posibles eventos, las medidas para cada uno, quién lo implementa, las responsabilidades del personal, el sistema de comunicación, los equipos para atender eventos, los organismos a los que se avisa en una emergencia y el programa de capacitación.', None, []),
            ('¿Se identificaron el destino de los residuos y los vehículos de transporte?', [r29(24, 'i'), r29(24, 'j')],
             'Indica el centro de acopio o la instalación de valorización o eliminación a la que irán los residuos, y el listado de vehículos a cargo del transporte.', None, []),
            ('¿Se evaluó si habrá residuos peligrosos y la capacitación acreditada requerida?', [r29(24, 'k'), r29(25)],
             'Algunos aparatos, como los de intercambio de temperatura, pueden contener sustancias peligrosas. Si la campaña recibirá residuos peligrosos, la solicitud debe acreditar la capacitación del personal de recepción, y el lugar debe tener una superficie fácil de limpiar, personal capacitado presente y cierre con vigilancia si quedan residuos fuera de horario.', None, []),
            ('¿Se prevé ingresar la solicitud al menos 40 días hábiles antes de iniciar la campaña?', [r29(24), r29(39), r29(40)],
             'Cuenta 40 días hábiles hacia atrás desde el inicio: cerca de dos meses. La SEREMI tiene 30 días hábiles para revisarla y, si hay observaciones, se subsanan en 5 días hábiles, prorrogables una vez.', None,
             [('autorizacion-sanitaria.html', 'Plazos de la autorización')]),
        ],
    },
    {
        'slug': 'checklist-preparacion-ejecucion', 'etapa': 3, 'nombre': 'Preparación y ejecución', 'titulo': 'Checklist de preparación y ejecución',
        'lema': 'Recibe los RAEE de manera segura y ordenada',
        'intro': 'Prepara el lugar, informa cómo entregar los equipos y capacita al personal. Durante la campaña, recibe solo los RAEE contemplados, registra las cantidades, aplica las medidas de seguridad y coordina su traslado al destino definido.',
        'datos': [('Antes', 'Informar y preparar el lugar'), ('Durante', 'Recibir, clasificar y registrar'), ('Al terminar', 'Limpiar y asegurar el sector')],
        'resultado': 'una campaña ejecutada con control de recepción, seguridad y registros trazables.',
        'preguntas': [
            ('¿Se informó qué RAEE se aceptan, dónde entregarlos y cuáles son los riesgos?', [r29(24, 'f')],
             'Difunde antes de la campaña qué aparatos se reciben y cuáles no, dónde y cuándo entregarlos, cómo manejarlos con seguridad y a dónde irán.', None,
             [('tamano-de-los-aparatos.html', 'Ejemplos de aparatos por tamaño')]),
            ('¿El sitio dispone de contenedores suficientes, señalización y condiciones de orden?', [r29(26, 'b')],
             'El lugar debe contar con suficientes contenedores para los residuos que recibirá. Señaliza las zonas de acceso, recepción, revisión, acopio y carga.', None, []),
            ('¿El personal conoce sus funciones y las condiciones de manejo seguro?', [r29(24, 'h')],
             'Capacita al equipo antes de abrir: qué se recibe y qué no, cómo revisar los equipos a la vista sin abrirlos, repararlos, desarmarlos, perforarlos ni enchufarlos, y qué hacer ante un evento.', None, []),
            ('¿Están disponibles el plan de contingencia y los medios para responder a eventos?', [r29(24, 'h')],
             'Ten a mano el plan de contingencia, los equipos para atender eventos y el listado de organismos a los que se avisa en una emergencia.', None, []),
            ('¿Existe un criterio de actuación ante RAEE dañados, con fugas o no aceptados?', [],
             'Define antes qué hacer con un equipo con fugas, roturas, baterías dañadas, humo u olor a quemado: separarlo según el procedimiento y avisar al responsable. Los aparatos no aceptados no deben entrar a las zonas de acopio.', None, []),
            ('¿Se registran cantidades por tipo de RAEE, incidencias y residuos rechazados?', [r29(7)],
             'Registra lo que recibes por tipo de aparato, las incidencias y los rechazos: lo necesitarás para el cierre y para el reporte en el RETC.', None, []),
            ('¿Están coordinados transporte, vehículos y entrega a la instalación de destino?', [r29(26)],
             'Los residuos se transportan hasta un centro de acopio o una instalación de valorización o eliminación autorizada. Coordina los retiros según la capacidad del punto.', None, []),
            ('¿Se verificará la limpieza y la seguridad del lugar al cierre de cada jornada?', [r29(26, 'a'), r29(25, 'c')],
             'El lugar se limpia al final de cada jornada. Si quedan residuos peligrosos acopiados fuera del horario de recepción, debe quedar cerrado y con vigilancia.', None, []),
        ],
    },
    {
        'slug': 'checklist-cierre-reporte', 'etapa': 4, 'nombre': 'Cierre y reporte', 'titulo': 'Checklist de cierre y reporte',
        'lema': 'Cierra el ciclo con respaldo y trazabilidad',
        'intro': 'El cierre no termina cuando se retira el último equipo. Confirma las cantidades recibidas, el transporte y los destinos, conserva los respaldos y prepara el reporte de la campaña en el RETC.',
        'datos': [('Retiro', 'Residuos enviados a destino'), ('Respaldos', 'Cantidades y trazabilidad'), ('RETC', 'Reporte luego de un mes')],
        'resultado': 'un cierre documentado y el reporte de cantidades y destino en el RETC.',
        'preguntas': [
            ('¿Se verificó el retiro de todos los residuos del lugar de campaña?', [r29(26)],
             'Confirma que no quedaron residuos en el lugar y que todos fueron transportados a su destino.', None, []),
            ('¿Se consolidaron las cantidades recibidas por cada tipo de RAEE?', [r29(7)],
             'Suma lo recibido por tipo de aparato: el reporte de la campaña informa las cantidades de cada residuo.', None, []),
            ('¿Existen respaldos de transporte e instalación de destino?', [r29(7)],
             'Guarda los respaldos de cada retiro y de la recepción en la instalación de destino: el reporte informa a qué instalación fue enviado cada residuo.', None, []),
            ('¿Se documentaron las incidencias, observaciones y rechazos ocurridos?', [],
             'Junta en un solo registro las incidencias, las observaciones y los aparatos rechazados durante la campaña.', None, []),
            ('¿Se comprobó el cierre operativo y la limpieza del punto de recepción?', [r29(26, 'a')],
             'Verifica que el punto quedó limpio y ordenado, sin residuos ni contenedores pendientes.', None, []),
            ('¿Está definido quién gestionará el reporte posterior mediante RETC?', [r29(7)],
             'El responsable de la campaña reporta en el RETC (Registro de Emisiones y Transferencia de Contaminantes) las cantidades recibidas de cada residuo y su instalación de destino.', None, []),
            ('¿Se consideró reportar luego de transcurrido un mes desde el término de la campaña?', [r29(7)],
             'El reporte se hace luego de transcurrido un mes del término de la campaña, en el RETC y con los formatos que publique el Ministerio de Salud.', None, []),
        ],
    },
]
CK = {c['slug']: c for c in CHECKLISTS}
for c in CHECKLISTS:
    c['total'] = len(c['preguntas'])


# ---------- Guías ----------
def entrada(t):
    """«Antes de abrir: la carpeta…» → el momento en negrita, para leer la lista de un vistazo."""
    i = t.find(': ')
    return f'<strong>{t[:i + 1]}</strong>{t[i + 1:]}' if '<' not in t and 0 < i <= 40 else t


def puntos(items):
    return '<ul class="guia-points">' + ''.join(f'<li>{I["punto"]}<span>{entrada(t)}{refs_html(r)}</span></li>' for t, r in items) + '</ul>'


def chips(datos):
    return '<ul class="guia-chips">' + ''.join(f'<li><strong>{esc(a)}</strong> · {esc(b)}</li>' for a, b in datos) + '</ul>'


def franja_ck(c, root=''):
    return (f'<div class="download-strip"><span class="download-icon">{I["lista"]}</span>'
            f'<p><strong>{esc(c["titulo"])}</strong><small>{c["total"]} preguntas · Sí, No o No sé, con qué hacer en cada caso</small></p>'
            f'<span class="download-actions"><a class="btn btn-quiet btn-small" href="{c["slug"]}.html">Usar el checklist</a></span></div>')


ETAPAS_GUIA = {
    1: [('Acuerda el alcance con la municipalidad u organización: comuna, contraparte, fecha tentativa, horarios, número de jornadas, servicios adicionales y una estimación de cuánto podría recibirse.', []),
        ('Define qué aparatos se reciben y cuáles no, con un listado «se recibe / no se recibe» para la difusión y la recepción, y qué hacer con un equipo dañado, con fugas o con baterías en mal estado.', [r29(24, 'b')]),
        ('Elige el lugar, las fechas, los horarios y la capacidad: zonas de acceso, recepción, revisión, registro, acopio y carga, y el permiso de uso del lugar cuando corresponda.', [r29(24, 'd'), r29(24, 'g')]),
        ('Deja definida la salida de los residuos antes de recibirlos: el centro de acopio o la instalación de valorización o eliminación, quién transporta y con qué vehículos.', [r29(24, 'i'), r29(24, 'j')])],
    2: [('La solicitud se presenta ante la SEREMI de Salud de la región donde se hará la campaña, al menos 40 días hábiles antes del inicio: cerca de dos meses.', [r29(24), r29(39)]),
        ('Reúne sus antecedentes: responsable, residuos y cantidades, equipos y contenedores, cronograma, actividades, información a la población, permiso del lugar, plan de contingencia, destino, vehículos y, si hay residuos peligrosos, la capacitación del personal.', [r29(24)]),
        ('La SEREMI tiene 30 días hábiles para revisarla. Si formula observaciones, se subsanan en 5 días hábiles, prorrogables una vez por otros 5, y luego tiene 30 días hábiles más para resolver.', [r29(39), r29(40)]),
        ('Si no se pronuncia en plazo, la solicitud se da por aprobada, salvo en campañas con residuos peligrosos, que terminan con una resolución.', [r29(40)])],
    3: [('Antes de abrir: la carpeta de la campaña (plan de contingencia, recepción, criterios de aceptación y rechazo, registros y checklist de apertura y cierre), el personal capacitado y el punto montado, con señalización y contenedores suficientes.', [r29(24, 'h'), r29(26, 'b')]),
        ('Durante la atención: se reciben solo los aparatos contemplados, se revisan a la vista sin abrirlos, repararlos, desarmarlos, perforarlos ni enchufarlos, se clasifican y se registran.', []),
        ('Si se reciben residuos peligrosos, el lugar debe tener una superficie fácil de limpiar, personal capacitado presente y cierre con vigilancia si quedan residuos fuera de horario.', [r29(25)]),
        ('Al terminar cada jornada se limpia el lugar y los residuos se transportan a un centro de acopio o a una instalación de valorización o eliminación autorizada.', [r29(26)])],
    4: [('Confirma el retiro de todos los aparatos, consolida las cantidades por tipo y guarda los respaldos de transporte y destino.', [r29(26)]),
        ('Documenta las incidencias, las observaciones y los rechazos.', []),
        ('Luego de un mes del término, el responsable reporta en el RETC las cantidades recibidas de cada residuo y su instalación de destino.', [r29(7)])],
}

ROLES = [
    ('Responsable general de la campaña', 'Coordina a la organización, al personal, la operación, el transporte y las decisiones no previstas.'),
    ('Responsable del plan de contingencia', 'Coordina la respuesta ante incidentes y emergencias. Puede ser el mismo responsable general.'),
    ('Recepción y clasificación', 'Controla el ingreso de los aparatos, su revisión a la vista y a qué sector va cada uno.'),
    ('Registro y trazabilidad', 'Registra ingresos, incidencias, salidas y destinos.'),
    ('Personal de apoyo', 'Traslada, ordena y separa los equipos según las indicaciones de recepción.'),
    ('Transportista o gestor', 'Retira los residuos y los lleva al destino definido.'),
    ('Contraparte de la organización', 'Coordina el lugar, la difusión, la comunidad y lo que necesite la municipalidad o la empresa.'),
]


def guia_paso_a_paso():
    secciones = []
    for c in CHECKLISTS:
        e = c['etapa']
        secciones.append(
            f'<section class="guia-sec guia-etapa" id="etapa-{e}" aria-labelledby="h-etapa-{e}"><p class="guia-etapa-n">Etapa {e} de 4</p><h2 id="h-etapa-{e}">{esc(c["nombre"])}</h2>'
            f'<p class="guia-sub">{esc(c["lema"])}.</p>{puntos(ETAPAS_GUIA[e])}'
            f'<p class="guia-resultado"><strong>Al terminar esta etapa:</strong> {esc(c["resultado"])}</p>{franja_ck(c)}</section>')
    roles = ''.join(f'<li>{I["punto"]}<span><strong>{esc(a)}.</strong> {esc(b)}</span></li>' for a, b in ROLES)
    cuerpo = (
        f'<section class="guia-sec" aria-labelledby="h-que"><h2 id="h-que">Qué es una campaña</h2><p class="guia-texto">Un conjunto de actividades de carácter temporal y esporádico cuyo único objetivo es recibir residuos de productos prioritarios, como los aparatos eléctricos y electrónicos, para enviarlos a un centro de acopio o a una instalación de valorización o de eliminación.{refs_html([r29(3, "c")])}</p>'
        f'<p class="guia-texto">Se organiza en cuatro etapas. Cada una tiene su checklist: respóndelo para ver qué te falta.</p></section>'
        + ''.join(secciones) +
        f'<section class="guia-sec" aria-labelledby="h-roles"><h2 id="h-roles">Quiénes participan</h2><p class="guia-sub">Una misma persona puede asumir más de un rol si la campaña es pequeña y cuenta con la capacitación correspondiente.</p><ul class="guia-points">{roles}</ul></section>'
        f'<section class="guia-sec" aria-labelledby="h-adicionales"><h2 id="h-adicionales">Servicios adicionales</h2><p class="guia-texto">Las municipalidades pueden sumar a la campaña el retiro domiciliario asistido, para quienes no pueden llevar sus aparatos al punto, y un área de equipos reutilizables, que separa los equipos completos que podrían tener una segunda vida. Se cotizan aparte y funcionan durante las jornadas de la campaña.</p>'
        f'<div class="guia-actions-row"><a class="btn btn-quiet btn-small" href="./#adicionales">Ver los servicios adicionales{I["flecha"]}</a></div></section>')
    pasos = [{'@type': 'HowToStep', 'position': c['etapa'], 'name': c['nombre'], 'text': f'{c["lema"]}. {c["intro"]}', 'url': f'{DOMINIO}/paso-a-paso.html#etapa-{c["etapa"]}'} for c in CHECKLISTS]
    return {
        'slug': 'paso-a-paso', 'icono': 'pasos', 'tipo': 'Guía',
        'titulo': 'Paso a paso de una campaña de recolección de RAEE',
        'menu': 'Paso a paso de la campaña', 'resumen': 'Las cuatro etapas, qué se hace en cada una y quién participa.',
        'descripcion': 'Cómo se organiza una campaña de recolección de aparatos eléctricos y electrónicos en la Región Metropolitana: planificación, autorización sanitaria, ejecución y cierre con reporte en el RETC.',
        'lead': 'Las cuatro etapas de una campaña de recolección de aparatos eléctricos y electrónicos (RAEE), qué se hace en cada una y quiénes participan.',
        'cuerpo': cuerpo, 'ld_extra': {'@type': 'HowTo', 'name': 'Cómo organizar una campaña de recolección de RAEE', 'inLanguage': 'es-CL', 'step': pasos},
        'faq': [],
    }


EJEMPLOS = [
    ('Pequeños', 'Ninguna de sus medidas supera 50 cm', 'Celulares, notebooks, tablets, routers, cámaras, consolas, hervidores, secadores de pelo, planchas, tostadoras, licuadoras, aspiradoras de mano, herramientas eléctricas pequeñas y muchos microondas.'),
    ('Grandes', 'Alguna de sus medidas supera 50 cm', 'Lavadoras, secadoras, lavavajillas, cocinas y hornos eléctricos, impresoras de oficina y televisores o monitores grandes.'),
    ('De intercambio de temperatura', 'Cualquier tamaño', 'Refrigeradores, congeladores, aire acondicionado y otros aparatos que enfrían, calientan o deshumidifican con gases refrigerantes o aceites. Se reciben enteros y aparte.'),
]


MEDIDAS = [
    ('Celular o tablet', '15 a 25 cm', 'Pequeños aparatos'),
    ('Hervidor, plancha o secador de pelo', '20 a 30 cm', 'Pequeños aparatos'),
    ('Microondas', '45 a 50 cm de ancho', 'Pequeños aparatos; si supera 50 cm, grandes'),
    ('Notebook', '30 a 40 cm', 'Computadores'),
    ('Televisor de 32″ o de 55″', '73 o 123 cm de ancho', 'Pantallas y monitores'),
    ('Lavadora', '60 × 85 cm', 'Grandes aparatos'),
    ('Refrigerador', '1,4 a 1,8 m de alto', 'Grandes aparatos; se recibe entero y aparte'),
]


def medidas_html():
    filas = ''.join(f'<tr><th scope="row">{esc(a)}<small>{esc(c)}</small></th><td>{esc(b)}</td></tr>' for a, b, c in MEDIDAS)
    return (f'<table class="tabla-tamanos"><caption class="sr-only">Medidas aproximadas de aparatos comunes</caption>'
            f'<thead><tr><th scope="col">Aparato y grupo en la ficha</th><th scope="col">Medida aprox.</th></tr></thead><tbody>{filas}</tbody></table>')


def guia_tamano():
    tarjetas = ''.join(f'<li><strong>{esc(a)}</strong><small>{esc(b)}</small><p>{esc(c)}</p></li>' for a, b, c in EJEMPLOS)
    cuerpo = (
        f'<section class="guia-sec" aria-labelledby="h-ley"><h2 id="h-ley">Qué dice la normativa chilena</h2>'
        f'<p class="guia-texto">Ni la Ley 20.920 ni el DS 22/2025 clasifican los aparatos por su tamaño. El DS 22/2025 los agrupa en tres categorías:</p>'
        + puntos([('<strong>Aparatos de intercambio de temperatura:</strong> los que enfrían, calientan o deshumidifican con sustancias distintas del agua, como gases refrigerantes o aceites; por ejemplo, refrigeradores y aire acondicionado.', [r22(2, 'n.° 1'), r22(4)]),
                  ('<strong>Paneles fotovoltaicos:</strong> desde 0,25 m²; los más pequeños cuentan como «otros aparatos».', [r22(2, 'n.° 12')]),
                  ('<strong>Otros aparatos eléctricos y electrónicos:</strong> todos los demás.', [r22(2, 'n.° 11')])]) +
        f'<p class="guia-texto">Para la campaña, el DS 29/2024 pide describir los equipos y contenedores con su tipo, material y dimensiones.{refs_html([r29(24, "c")])}</p></section>'
        f'<section class="guia-sec" aria-labelledby="h-criterio"><h2 id="h-criterio">Qué es un aparato pequeño</h2>'
        f'<p class="guia-texto">Para organizar la campaña usamos la referencia de la normativa europea de residuos de aparatos eléctricos y electrónicos (Directiva 2012/19/UE): un aparato es <strong>pequeño</strong> si ninguna de sus medidas exteriores supera 50 cm, y <strong>grande</strong> si alguna la supera.</p>'
        f'<ul class="tamano-tipos">{tarjetas}</ul>'
        f'<p class="guia-sub">En la ficha, los computadores y las pantallas van en su propio grupo, sean pequeños o grandes.</p></section>'
        f'<section class="guia-sec" aria-labelledby="h-medidas"><h2 id="h-medidas">Medidas de referencia</h2>'
        f'<p class="guia-texto">Medidas aproximadas de aparatos comunes, para saber en qué grupo va cada uno. Lo que vale es la medida de tu aparato.</p>'
        f'{medidas_html()}</section>'
        f'<section class="guia-sec" aria-labelledby="h-influye"><h2 id="h-influye">Cómo influye el tamaño en la campaña</h2>'
        + puntos([('<strong>Recepción:</strong> los pequeños se reciben en mesones y contenedores; los grandes necesitan una zona de carga, acceso para vehículos y ayuda para bajarlos.', []),
                  ('<strong>Contenedores y transporte:</strong> el tamaño y la cantidad definen cuántos contenedores, cuánto espacio y qué vehículos se necesitan.', [r29(24, 'c'), r29(24, 'j')]),
                  ('<strong>Retiro domiciliario asistido:</strong> pensado para aparatos grandes de quienes no pueden llevarlos al punto. Al inscribirse se indica el tipo, la cantidad, las medidas y el estado de cada aparato.', []),
                  ('<strong>Peso estimado:</strong> en la ficha indicas el peso total aproximado de todo lo que esperas recibir; los tipos y cantidades se precisan en la reunión.', [])]) +
        '</section>')
    faq = [
        ('¿Un microondas es pequeño o grande?', 'Depende de sus medidas: si ninguna supera 50 cm, cuenta como pequeño. Muchos microondas de uso doméstico miden entre 45 y 50 cm de ancho.'),
        ('¿Un refrigerador se recibe como aparato grande?', 'Es un aparato de intercambio de temperatura: puede contener gases refrigerantes o aceites, por eso se recibe entero y aparte, cualquiera sea su tamaño.'),
        ('¿La ley chilena define qué es un aparato pequeño?', 'No. La Ley 20.920 y el DS 22/2025 no clasifican los aparatos por tamaño. El criterio de 50 cm es una referencia práctica de la normativa europea que usamos para organizar la campaña.'),
    ]
    return {
        'slug': 'tamano-de-los-aparatos', 'icono': 'tamano', 'tipo': 'Guía',
        'titulo': '¿Qué es un aparato pequeño? Tamaño de los aparatos en una campaña',
        'menu': 'Tamaño de los aparatos', 'resumen': 'Qué cuenta como pequeño o grande, con ejemplos, y cómo influye en la campaña.',
        'descripcion': 'Qué es un aparato eléctrico o electrónico pequeño o grande, con ejemplos, qué dice la normativa chilena (DS 22/2025) y cómo influye el tamaño en una campaña de recolección de RAEE.',
        'lead': 'Qué cuenta como aparato pequeño o grande, con ejemplos, qué dice la normativa chilena y cómo influye el tamaño al organizar la campaña.',
        'cuerpo': cuerpo, 'ld_extra': None, 'faq': faq,
    }


def guia_autorizacion():
    cuerpo = (
        f'<section class="guia-sec" aria-labelledby="h-quien"><h2 id="h-quien">Quién la pide, dónde y cuándo</h2>'
        + puntos([('La pide el responsable de la campaña: la municipalidad, la empresa, el sistema de gestión o quien la organice.', [r29(24, 'a')]),
                  ('Se presenta ante la SEREMI de Salud de la región donde se hará la campaña; en la Región Metropolitana, la SEREMI de Salud Metropolitana.', [r29(24), r29(39)]),
                  ('Al menos 40 días hábiles antes del inicio: cerca de dos meses.', [r29(24)])]) + '</section>'
        f'<section class="guia-sec" aria-labelledby="h-incluye"><h2 id="h-incluye">Qué incluye la solicitud</h2>'
        f'<p class="guia-texto">Describe la campaña: responsable, residuos y cantidades, equipos y contenedores, cronograma, actividades, información a la población, permiso del lugar, plan de contingencia, destino, vehículos y, si hay residuos peligrosos, la capacitación del personal.{refs_html([r29(24)])}</p>'
        f'{franja_ck(CK["checklist-autorizacion-sanitaria"])}</section>'
        f'<section class="guia-sec" aria-labelledby="h-plazos"><h2 id="h-plazos">Plazos de la revisión</h2><ol class="guia-steps">'
        f'<li><span>La SEREMI tiene 30 días hábiles para revisar la solicitud: puede aprobarla, rechazarla fundadamente u observarla, e inspeccionar los lugares.{refs_html([r29(39)])}</span></li>'
        f'<li><span>Las observaciones se subsanan en 5 días hábiles desde su notificación, prorrogables una vez por otros 5.{refs_html([r29(40)])}</span></li>'
        f'<li><span>Con las observaciones subsanadas, tiene 30 días hábiles más para aprobarla o rechazarla.{refs_html([r29(40)])}</span></li>'
        f'</ol><p class="guia-sub guia-after">Si la SEREMI no se pronuncia en plazo, la solicitud se da por aprobada, salvo en campañas con residuos peligrosos, que terminan con una resolución.</p></section>'
        f'<section class="guia-sec" aria-labelledby="h-obtener"><h2 id="h-obtener">Cómo obtenerla si aún no la tienes</h2><ol class="guia-steps">'
        f'<li><span>Define la planificación: alcance, responsable, aparatos, lugar, fechas y destino.</span></li>'
        f'<li><span>Reúne los antecedentes de la solicitud con el checklist de autorización sanitaria.</span></li>'
        f'<li><span>Preséntala en la SEREMI de Salud al menos 40 días hábiles antes del inicio.</span></li>'
        f'<li><span>Responde las observaciones dentro de 5 días hábiles, si las hay.</span></li></ol>'
        f'<p class="guia-texto">Si organizas la campaña con nosotros, preparamos contigo la solicitud y sus antecedentes.</p>'
        f'<div class="guia-actions-row"><button class="btn btn-primary btn-small" type="button" data-dock-open="contacto">Organizar una campaña</button></div></section>'
        f'<section class="guia-sec" aria-labelledby="h-durante"><h2 id="h-durante">Durante y después de la campaña</h2>'
        + puntos([('El lugar se limpia al final de cada jornada, cuenta con contenedores suficientes y los residuos se llevan a un centro de acopio o a una instalación de valorización o eliminación autorizada.', [r29(26)]),
                  ('Con residuos peligrosos: superficie fácil de limpiar, personal capacitado presente y cierre con vigilancia si quedan residuos fuera de horario.', [r29(25)]),
                  ('Luego de un mes del término, el responsable reporta en el RETC las cantidades recibidas y su destino.', [r29(7)])]) + '</section>')
    faq = [
        ('¿Con cuánta anticipación se pide la autorización sanitaria de una campaña?', 'Al menos 40 días hábiles antes del inicio, cerca de dos meses, ante la SEREMI de Salud de la región (DS 29/2024, art. 24).'),
        ('¿Qué pasa si la SEREMI no responde a tiempo?', 'La solicitud se da por aprobada, salvo en campañas con residuos peligrosos, que terminan con una resolución (DS 29/2024, art. 40).'),
    ]
    return {
        'slug': 'autorizacion-sanitaria', 'icono': 'autorizacion', 'tipo': 'Guía',
        'titulo': 'Autorización sanitaria de una campaña de recolección (DS 29/2024)',
        'menu': 'Autorización sanitaria', 'resumen': 'Quién la pide, ante quién, con cuánta anticipación y cómo obtenerla.',
        'descripcion': 'Cómo obtener la autorización sanitaria de una campaña de recolección de RAEE: se pide a la SEREMI de Salud 40 días hábiles antes, qué incluye y los plazos de revisión del DS 29/2024.',
        'lead': 'Quién la pide, ante quién, con cuánta anticipación, qué incluye y cómo obtenerla si aún no la tienes.',
        'cuerpo': cuerpo, 'ld_extra': None, 'faq': faq,
    }


GUIAS = [guia_paso_a_paso(), guia_tamano(), guia_autorizacion()]
G = {g['slug']: g for g in GUIAS}


# ---------- Panel «Ayuda» (mismo diseño que Transporte) ----------
TEMAS = [
    ('pasos', 'Paso a paso de la campaña', 'Las cuatro etapas, de la idea al reporte', 'pasos', ['paso-a-paso']),
    ('tamano', 'Tamaño de los aparatos', 'Qué es un aparato pequeño', 'tamano', ['tamano-de-los-aparatos']),
    ('autorizacion', 'Autorización sanitaria', 'Cómo se pide y en qué plazos', 'autorizacion', ['autorizacion-sanitaria']),
    ('checklists', 'Checklists', 'Una pauta por etapa, con qué hacer en cada caso', 'lista', []),
    ('normativa', 'Normativa', 'Lo que exige cada norma, en simple', 'normativa', []),
]
GRUPOS = [('Guías', ['pasos', 'tamano', 'autorizacion']), ('Documentos', ['checklists', 'normativa'])]
CK_DE_GUIA = {'paso-a-paso': 'checklist-planificacion', 'autorizacion-sanitaria': 'checklist-autorizacion-sanitaria', 'tamano-de-los-aparatos': None}


def _fila_guia(g):
    ck = CK.get(CK_DE_GUIA.get(g['slug']) or '')
    lista = (f'<a class="ayu-btn" href="{ck["slug"]}.html" data-lista="{ck["slug"]}">{I["lista"]}<span>Checklist · {ck["total"]} preguntas</span></a>' if ck else '')
    return (f'<li class="ayu-guia"><span class="doc-icon">{I[g["icono"]]}</span><div class="ayu-guia-t">'
            f'<a class="ayu-guia-titulo" href="{g["slug"]}.html" data-guia="{g["slug"]}">{esc(g["titulo"])}</a><p>{esc(g["resumen"])}</p>'
            f'<div class="ayu-acciones"><a class="ayu-btn is-guia" href="{g["slug"]}.html">Leer la guía{I["flecha"]}</a>{lista}</div></div></li>')


def menu_html():
    partes = {}
    for k, nombre, bajada, icono, slugs in TEMAS:
        if k == 'checklists':
            filas = ''.join(f'<li class="ayu-ck"><a class="ayu-ck-titulo" href="{c["slug"]}.html" data-lista="{c["slug"]}"><span class="doc-icon">{I["lista"]}</span>'
                            f'<span><strong>{c["etapa"]}. {esc(c["nombre"])}</strong><small>{c["total"]} preguntas · {esc(c["lema"])}</small></span></a></li>' for c in CHECKLISTS)
            cuerpo = f'<p class="docs-lead">Responde Sí, No o No sé en cada pregunta: te mostramos qué hacer con lo que falta. Tus respuestas quedan en este dispositivo.</p><ul class="ayu-cks">{filas}</ul>'
        elif k == 'normativa':
            filas = ''.join(f'<li class="ayu-ck"><a class="ayu-ck-titulo" href="{n["slug"]}.html"><span class="doc-icon">{I["normativa"]}</span>'
                            f'<span><strong>{esc(n["corto"])}</strong><small>{esc(n["nombre"])}</small></span></a></li>' for n in N.NORMAS)
            cuerpo = (f'<p class="docs-lead">Lo que exige cada norma a una campaña de RAEE, en simple y con sus artículos oficiales.</p><ul class="ayu-cks">{filas}</ul>'
                      f'<div class="ayu-acciones"><a class="ayu-btn is-guia" href="normativa.html">Toda la normativa{I["flecha"]}</a></div>')
        else:
            cuerpo = f'<ul class="ayu-guias">{"".join(_fila_guia(G[s]) for s in slugs)}</ul>'
        partes[k] = (f'<button class="ayu-tema" type="button" id="ayu-t-{k}" aria-expanded="false" aria-controls="ayu-{k}" data-ayu-tema="{k}" data-tema="{k}">'
                     f'<span class="doc-icon">{I[icono]}</span><span class="ayu-tema-t"><strong>{esc(nombre)}</strong><small>{esc(bajada)}</small></span>'
                     f'<span class="ayu-tema-chev">{I["abajo"]}</span></button>'
                     f'<div class="ayu-detalle" id="ayu-{k}" role="region" aria-labelledby="ayu-t-{k}" data-ayu-detalle="{k}" data-tema="{k}" inert><div class="ayu-detalle-in">{cuerpo}</div></div>')
    grupos = ''.join(f'<p class="ayu-titulo">{esc(nombre)}</p><div class="ayu-temas">{"".join(partes[k] for k in claves)}</div>' for nombre, claves in GRUPOS)
    pie = (f'<div class="docs-pie"><p>¿No encuentras lo que buscas?</p><button class="docs-pie-btn" type="button" data-dock-open="conversar">{I["conversar"]}<span>Conversar por WhatsApp</span></button></div>')
    return (f'<div class="docs-panel" id="docs-panel" data-docs-panel inert><div class="docs-inner"><div class="docs-scroll"><div class="docs-wrap">'
            f'<button class="ayu-volver" type="button" data-ayu-volver hidden>{I["volver"]}<span>Todos los temas</span></button>'
            f'<button class="ayu-busca" type="button" data-busca-abrir>{I["buscar"]}<span>Buscar en guías, checklists, preguntas y normas…</span><kbd aria-hidden="true">⌘K</kbd></button>'
            f'{grupos}{pie}</div></div></div></div>')


BOTON = (f'<a href="#ayuda" class="nav-docs" data-docs-open aria-controls="docs-panel" aria-expanded="false">Ayuda<span class="nav-docs-chev">{I["abajo"]}</span></a>')


def con_menu(s):
    """Cabecera con el botón «Ayuda» (en lugar de «Normativa») y el panel entre sus marcas."""
    s = s.replace('<header class="site-header">', '<header class="site-header has-docs">', 1)
    s = re.sub(r'\n\s*<a href="normativa\.html"(?: aria-current="page")?>Normativa</a>', '', s, count=1)
    if 'class="nav-docs"' not in s:
        s = re.sub(r'(\n(\s*)<a [^>]*class="btn btn-primary btn-small"[^>]*>Organizar una campaña</a>)', lambda m: f'\n{m.group(2)}{BOTON}' + m.group(1), s, count=1)
    a, b = '<!-- ayuda:menu:inicio -->', '<!-- ayuda:menu:fin -->'
    if a not in s:
        s = s.replace('    </nav>\n  </div>\n</header>', f'    </nav>\n{a}\n{b}\n  </div>\n</header>', 1)
    assert a in s and b in s, 'no encontré dónde poner el panel «Ayuda»'
    return s[:s.index(a) + len(a)] + '\n' + menu_html() + '\n' + s[s.index(b):]


# ---------- «Cómo funciona una campaña» en la portada: solo el título de cada etapa; al tocarlo se despliega ----------
# Qué se hace, quién y cuándo, del procedimiento del cliente y del DS 29/2024 (los plazos, con su artículo en el paso a paso)
ETAPAS_PORTADA = {
    1: {'pasos': ['Acordar el alcance: comuna, fecha tentativa, número de jornadas y servicios adicionales.',
                  'Decidir qué aparatos se reciben y cuáles no, con una estimación de cuánto llegará.',
                  'Elegir el lugar y los horarios, y gestionar el permiso de uso del espacio.',
                  'Dejar definido a dónde irán los residuos y quién los transporta.'],
        'quien': 'La municipalidad o la empresa, con nuestro equipo.',
        'cuando': 'Antes de pedir la autorización sanitaria, que se presenta al menos 40 días hábiles antes de la campaña.'},
    2: {'pasos': ['Reunir los antecedentes: responsable, aparatos y cantidades, contenedores, cronograma, plan de contingencia, destino y vehículos.',
                  'Presentar la solicitud a la SEREMI de Salud de la región.',
                  'Responder las observaciones, si las hay, dentro de 5 días hábiles (prorrogables una vez).'],
        'quien': 'El responsable de la campaña. Si la organizas con nosotros, preparamos contigo la solicitud.',
        'cuando': 'Al menos 40 días hábiles antes del inicio. La SEREMI tiene 30 días hábiles para revisarla.'},
    3: {'pasos': ['Antes: informar a la comunidad qué se recibe, capacitar al equipo y montar el punto con señalización y contenedores.',
                  'Durante: recibir solo los aparatos contemplados, revisarlos a la vista sin abrirlos ni enchufarlos, clasificarlos y registrarlos.',
                  'Al terminar cada jornada: limpiar el lugar y llevar los residuos a un destino autorizado.'],
        'quien': 'El equipo de la campaña y el transportista; la organización coordina el lugar y la difusión.',
        'cuando': 'Durante las jornadas de la campaña.'},
    4: {'pasos': ['Confirmar que se retiró todo y que el lugar quedó limpio.',
                  'Sumar lo recibido por tipo de aparato y guardar los respaldos de transporte y destino.',
                  'Reportar en el RETC las cantidades y la instalación de destino.'],
        'quien': 'El responsable de la campaña, con el equipo técnico.',
        'cuando': 'Al terminar; el reporte en el RETC, luego de un mes del término.'},
}


def etapas_html():
    filas = []
    for c in CHECKLISTS:
        e = ETAPAS_PORTADA[c['etapa']]
        pasos = ''.join(f'<li>{entrada(t)}</li>' for t in e['pasos'])
        datos = ''.join(f'<div><dt>{a}</dt><dd>{esc(b)}</dd></div>' for a, b in (('Quién', e['quien']), ('Cuándo', e['cuando']), ('Resultado', c['resultado'][0].upper() + c['resultado'][1:])))
        filas.append(
            f'<details id="como-funciona-{c["etapa"]}"><summary><span class="etapa-n">{c["etapa"]}</span><span class="etapa-titulo"><strong>{esc(c["nombre"])}</strong></span>'
            f'<span class="plus" aria-hidden="true"></span></summary><div class="answer"><p>{esc(c["intro"])}</p>'
            f'<ul class="etapa-pasos">{pasos}</ul><dl class="etapa-datos">{datos}</dl>'
            f'<p class="etapa-acciones"><a href="{c["slug"]}.html">Checklist de {c["total"]} preguntas{I["flecha"]}</a>'
            f'<a href="paso-a-paso.html#etapa-{c["etapa"]}">Paso a paso{I["flecha"]}</a></p></div></details>')
    return nbsp(f'      <div class="accordion etapas-lista reveal">{"".join(filas)}</div>')


def con_etapas(s):
    a, b = '<!-- ayuda:etapas:inicio -->', '<!-- ayuda:etapas:fin -->'
    if a not in s:
        return s
    return s[:s.index(a) + len(a)] + '\n' + etapas_html() + '\n      ' + s[s.index(b):]


# ---------- Ventana «Tamaño de los aparatos» de la ficha (la abre el «?» de «Aparatos» y va dentro de su ventana) ----------
def tamanos_html():
    return ('<div id="guia-tamanos" hidden data-title="Tamaño de los aparatos" data-pregunta="¿Qué tamaño tiene cada tipo?" '
            'data-sub="Pequeño si ninguna medida supera 50 cm; grande si alguna la supera.">'
            '<p>Es la referencia de la normativa europea (Directiva 2012/19/UE): la ley chilena no clasifica los aparatos por tamaño. '
            'Los computadores y las pantallas van en su propio grupo, de cualquier tamaño.</p>'
            f'{medidas_html()}'
            '<p><a class="link" href="tamano-de-los-aparatos.html" target="_blank" rel="noopener">Ver la guía completa<span class="sr-only"> (se abre en otra pestaña)</span></a></p></div>')


def ck_ficha_html():
    campos = ''.join(f'<input type="hidden" name="{c["slug"]}" data-label="{esc(c["titulo"])}" data-ck="{c["slug"]}">' for c in CHECKLISTS)
    return ('<div class="ck-adjunto" data-ck-adjunto hidden><label class="ck-adjunto-fila"><input type="checkbox" data-ck-adjunto-incluir checked>'
            f'<span class="ck-adjunto-icono" aria-hidden="true">{I["lista"]}</span>'
            '<span class="ck-adjunto-t"><strong>Incluir mis checklists</strong><small data-ck-adjunto-detalle></small></span></label>'
            f'{campos}</div>')


def con_ck_ficha(s):
    a, b = '<!-- ayuda:ck-ficha:inicio -->', '<!-- ayuda:ck-ficha:fin -->'
    if a not in s:
        return s
    return s[:s.index(a) + len(a)] + '\n' + ck_ficha_html() + '\n' + s[s.index(b):]


def con_tamanos(s):
    a, b = '<!-- ayuda:tamanos:inicio -->', '<!-- ayuda:tamanos:fin -->'
    if a not in s:
        return s
    return s[:s.index(a) + len(a)] + '\n' + nbsp(tamanos_html()) + '\n' + s[s.index(b):]


# ---------- Páginas ----------
def fuente():
    return (f'<footer class="norm-source"><p>Orientación general: el alcance de cada campaña se define en su propuesta y no reemplaza la revisión técnica ni legal de cada caso. '
            f'Las citas llevan al texto oficial en este sitio (revisado el {REVISADO_TXT}).</p>'
            f'<a class="btn btn-quiet btn-small" href="./">{I["volver"]}<span>Volver al inicio</span></a></footer>')


TEMA_DE = {'paso-a-paso': 'pasos', 'tamano-de-los-aparatos': 'tamano', 'autorizacion-sanitaria': 'autorizacion'}


def pagina(base, slug, titulo, desc, ld_extra, faq, main, kind_ico, tema='general'):
    url = f'{DOMINIO}/{slug}.html'
    graph = N.ld_base(base) + [
        {'@type': 'WebPage', '@id': f'{url}#pagina', 'url': url, 'name': titulo, 'description': desc, 'inLanguage': 'es-CL',
         'isPartOf': {'@id': f'{DOMINIO}/#sitio'}, 'dateModified': REVISADO},
        N.migas([('Inicio', f'{DOMINIO}/'), ('Ayuda', f'{DOMINIO}/paso-a-paso.html'), (titulo, url)]),
    ]
    if ld_extra:
        graph.append(ld_extra)
    if faq:
        graph.append({'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]})
    s = N.con_cabeza(base, f'{titulo} | Campañas de recolección', desc, url, {'@context': 'https://schema.org', '@graph': graph})
    s = re.sub(r'<main id="contenido">.*?</main>', lambda m: f'<main id="contenido">\n{nbsp(main)}\n</main>', s, count=1, flags=re.S)
    s = s.replace('<a href="preguntas.html" aria-current="page">Preguntas</a>', '<a href="preguntas.html">Preguntas</a>')
    s = s.replace('class="nav-docs" data-docs-open', 'class="nav-docs" aria-current="true" data-docs-open', 1)
    return N.con_tema(s, tema)


def pagina_guia(g, base):
    ck = CK.get(CK_DE_GUIA.get(g['slug']) or '')
    acciones = (f'<button class="btn btn-ink btn-small" type="button" data-dock-open="contacto">{I["ficha"]}<span>Organizar una campaña</span></button>'
                + (f'<a class="btn btn-quiet btn-small" href="{ck["slug"]}.html">{I["lista"]}<span>{esc(ck["titulo"])}</span></a>' if ck else ''))
    main = (f'  <article class="container guia">\n    {N.crumbs([("Inicio", "./"), (g["menu"], "")])}\n'
            f'    <header class="guia-head"><p class="norm-kind"><span class="doc-icon">{I[g["icono"]]}</span>{esc(g["tipo"])}</p>'
            f'<h1 class="norm-title">{esc(g["titulo"])}</h1><p class="norm-lead">{esc(g["lead"])}</p>'
            f'<div class="norm-actions guia-actions">{acciones}</div></header>\n    {g["cuerpo"]}\n'
            + (f'    {N.faq_html(g["faq"])}\n' if g['faq'] else '') + f'    {fuente()}\n  </article>')
    return pagina(base, g['slug'], g['titulo'], g['descripcion'], g['ld_extra'], g['faq'], main, g['icono'], TEMA_DE[g['slug']])


def pagina_checklist(c, base):
    etapas = ''.join(
        f'<li><a href="{x["slug"]}.html" data-ckc-etapa="{x["slug"]}" data-ckc-total="{x["total"]}"{" aria-current=\"page\"" if x is c else ""}>'
        f'<span class="ckc-etapa-n">{x["etapa"]}</span><span class="ckc-etapa-t"><strong>{esc(x["nombre"])}</strong><small data-ckc-etapa-estado>{x["total"]} preguntas</small></span></a></li>'
        for x in CHECKLISTS)
    items = []
    for i, (texto, refs, no, nose, enlaces) in enumerate(c['preguntas'], 1):
        links = ''.join(
            (f'<button class="ckc-link" type="button" data-dock-open="{h}">{esc(t)}</button>' if not h.endswith('.html') else f'<a class="ckc-link" href="{h}">{esc(t)}</a>')
            for h, t in enlaces)
        reco = (f'<div class="ckc-reco" data-ckc-reco hidden><p class="ckc-reco-t">{I["idea"]}<span>Qué hacer</span></p>'
                f'<p data-ckc-texto-no>{esc(no)}</p>' + (f'<p data-ckc-texto-nose hidden>{esc(nose)}</p>' if nose else '') +
                (f'<p class="ckc-links">{links}</p>' if links else '') + '</div>')
        items.append(
            f'<li class="ckc-item" data-n="{i}" id="p{i}"><div class="ckc-q"><span class="ckc-num">{i}</span><div><p class="ckc-texto" id="q{i}">{esc(texto)}</p>{refs_html(refs)}</div></div>'
            f'<div class="ckc-resp"><div class="ckc-ops" role="group" aria-labelledby="q{i}">'
            f'<button type="button" data-ckc-op="si" aria-pressed="false">Sí</button><button type="button" data-ckc-op="no" aria-pressed="false">No</button>'
            f'<button type="button" data-ckc-op="nose" aria-pressed="false">No sé</button></div>'
            f'<button class="ckc-quitar" type="button" data-ckc-quitar hidden>{I["borrar"]}<span>Quitar respuesta</span></button></div>{reco}</li>')
    sig = next((x for x in CHECKLISTS if x['etapa'] == c['etapa'] + 1), None)
    datos = ''.join(f'<li><strong>{esc(a)}</strong><span>{esc(b)}</span></li>' for a, b in c['datos'])
    main = (
        f'  <article class="container guia ckc" data-ck-campana data-clave="cr-{c["slug"]}" data-total="{c["total"]}" data-nombre="{esc(c["nombre"])}">\n'
        f'    {N.crumbs([("Inicio", "./"), ("Paso a paso", "paso-a-paso.html"), (c["titulo"], "")])}\n'
        f'    <header class="guia-head"><p class="norm-kind"><span class="doc-icon">{I["lista"]}</span>Checklist · Etapa {c["etapa"]} de 4 · {c["total"]} preguntas</p>'
        f'<h1 class="norm-title">{esc(c["nombre"])}: {esc(c["lema"][0].lower() + c["lema"][1:])}</h1>'
        f'<p class="norm-lead">{esc(c["intro"])}</p>'
        f'<div class="norm-actions guia-actions"><a class="btn btn-quiet btn-small" href="paso-a-paso.html#etapa-{c["etapa"]}">{I["guia"]}<span>Leer la guía</span></a>'
        f'<button class="btn btn-quiet btn-small" type="button" data-ckc-imprimir>{I["imprimir"]}<span>Imprimir o guardar en PDF</span></button></div></header>\n'
        f'    <nav class="ckc-etapas" aria-label="Etapas de la campaña"><ol>{etapas}</ol></nav>\n'
        f'    <ul class="ckc-datos">{datos}</ul>\n'
        f'    <div class="ckc-barra" data-ckc-barra><p><strong data-ckc-hechas>0</strong> de {c["total"]} respondidas<span data-ckc-detalle></span></p>'
        f'<button class="ckc-borrar" type="button" data-ckc-borrar hidden>{I["borrar"]}<span>Borrar respuestas</span></button>'
        f'<span class="ckc-progreso" aria-hidden="true"><i data-ckc-progreso></i></span></div>\n'
        f'    <p class="ckc-ayuda">Marca una respuesta por pregunta. Si marcas <strong>No</strong> o <strong>No sé</strong>, te mostramos qué hacer. Para cambiarla, toca otra; para dejarla en blanco, «Quitar respuesta». Tus respuestas quedan guardadas en este dispositivo.</p>\n'
        f'    <ol class="ckc-lista">{"".join(items)}</ol>\n'
        f'    <section class="ckc-fin" aria-labelledby="h-pendientes"><h2 id="h-pendientes">Tus pendientes</h2>'
        f'<div data-ckc-pendientes><p class="ckc-vacio">Aún no marcas «No» ni «No sé» en esta etapa.</p></div>'
        f'<p class="guia-resultado"><strong>Al terminar esta etapa:</strong> {esc(c["resultado"])}</p>'
        f'<div class="ckc-fin-acciones"><button class="btn btn-quiet" type="button" data-ckc-imprimir>{I["imprimir"]}<span>Guardar en PDF</span></button>'
        f'<button class="btn btn-primary" type="button" data-dock-open="contacto">{I["ficha"]}<span>Cotizar mi campaña</span></button></div>'
        f'<p class="ckc-fin-nota">Al cotizar desde este dispositivo, la ficha te ofrece incluir tus respuestas de los checklists.</p>'
        + (f'<p class="ckc-siguiente"><a href="{sig["slug"]}.html">Seguir con la etapa {sig["etapa"]}: {esc(sig["nombre"])}{I["flecha"]}</a></p>' if sig else '')
        + '</section>\n'
        f'    {fuente()}\n  </article>')
    desc = f'Checklist de la etapa {c["etapa"]} de una campaña de recolección de RAEE ({c["nombre"].lower()}): {c["total"]} preguntas con Sí, No o No sé y qué hacer en cada caso, según el DS 29/2024.'
    s = pagina(base, c['slug'], f'{c["titulo"]} de una campaña de RAEE', desc, None, None, main, 'lista', 'checklists')
    # El checklist trae su propio script, al final, después de los del sitio
    return s.replace('</body>', f'<script src="assets/campanas/checklist.js?v={version(base)}" defer></script>\n</body>', 1)


def version(base):
    m = re.search(r'\?v=(\w+)', base)
    return m.group(1) if m else '1'


# ---------- sitemap.xml y llms.txt ----------
PAGINAS = [g['slug'] for g in GUIAS] + [c['slug'] for c in CHECKLISTS]


def actualizar_sitemap():
    p = ROOT / 'sitemap.xml'
    s = p.read_text(encoding='utf-8')
    s = re.sub(r'\s*<url><loc>[^<]*/(?:' + '|'.join(PAGINAS) + r')\.html</loc>.*?</url>', '', s, flags=re.S)
    nuevas = ''.join(f'\n  <url><loc>{DOMINIO}/{x}.html</loc><lastmod>{REVISADO}</lastmod></url>' for x in PAGINAS)
    p.write_text(s.replace('</urlset>', nuevas + '\n</urlset>'), encoding='utf-8')


def actualizar_llms():
    p = ROOT / 'llms.txt'
    s = p.read_text(encoding='utf-8')
    a, b = '<!-- ayuda:inicio -->', '<!-- ayuda:fin -->'
    bloque = ['## Guías', *[f'- [{g["titulo"]}]({DOMINIO}/{g["slug"]}.html): {g["descripcion"]}' for g in GUIAS], '',
              '## Checklists por etapa (Sí, No o No sé, con qué hacer en cada caso)',
              *[f'- [{c["etapa"]}. {c["nombre"]}]({DOMINIO}/{c["slug"]}.html): {c["total"]} preguntas. {c["lema"]}.' for c in CHECKLISTS]]
    texto = f'{a}\n' + '\n'.join(bloque) + f'\n{b}'
    if a in s:
        s = s[:s.index(a)] + texto + s[s.index(b) + len(b):]
    else:
        s = s.rstrip('\n') + '\n\n' + texto + '\n'
    p.write_text(s, encoding='utf-8')


def con_ficha(s, base):
    """La ficha flotante (tarjeta del hero) de una página secundaria: la misma de preguntas.html."""
    a, b = '<div class="hcard">', '<footer class="site-footer">'
    return s[:s.index(a)] + base[base.index(a):base.index(b)] + s[s.index(b):]


# ---------- Preguntas con dirección propia y el índice del buscador ----------
def slug(texto, n=60):
    import unicodedata
    t = unicodedata.normalize('NFD', re.sub(r'<[^>]+>', '', texto)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:n].strip('-')


def con_ids(s):
    """Cada pregunta desplegable (<details> sin atributos) recibe un id a partir de su texto: #p-que-es-una-campana…"""
    usados = set(re.findall(r'\bid="([^"]+)"', s))
    def poner(m):
        base = 'p-' + slug(m.group(2))
        k, i = base, 2
        while k in usados:
            k, i = f'{base}-{i}', i + 1
        usados.add(k)
        return f'<details id="{k}">{m.group(1)}{m.group(2)}'
    return re.sub(r'<details>(<summary>)(.*?)(?=<span class="plus")', poner, s)


def texto_plano(h):
    import html as H
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()


def indice_busqueda():
    items = [{'g': 'Acciones', 't': 'Organizar una campaña', 's': 'Abre la ficha preliminar para cotizar la campaña', 'a': 'contacto'}]
    for t, sub, u in (('Para quién es cada campaña', 'Municipalidades, empresas y sistemas de gestión', './#publicos'),
                      ('Servicios adicionales para municipalidades', 'Retiro domiciliario asistido y área de equipos reutilizables', './#adicionales'),
                      ('Cómo funciona una campaña', 'Las cuatro etapas, de la planificación al reporte', './#proceso'),
                      ('¿Hasta cuándo pedir la autorización?', 'Calcula el plazo y la fecha límite para presentar la solicitud', './#plazo'),
                      ('Aparatos que se reciben', 'Galería de aparatos por tipo', './#aparatos')):
        items.append({'g': 'Portada', 't': t, 's': sub, 'u': u})
    for g in GUIAS:
        items.append({'g': 'Guías', 't': g['titulo'], 's': g['resumen'], 'u': f'{g["slug"]}.html'})
        for hid, h in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', g['cuerpo']):
            items.append({'g': 'Guías', 't': texto_plano(h), 's': g['menu'], 'u': f'{g["slug"]}.html#{hid}'})
    for c in CHECKLISTS:
        items.append({'g': 'Checklists', 't': c['titulo'], 's': f'Etapa {c["etapa"]} de 4 · {c["lema"]}', 'u': f'{c["slug"]}.html'})
        for i, q in enumerate(c['preguntas'], 1):
            items.append({'g': 'Checklists', 't': q[0], 's': f'{c["titulo"]}, pregunta {i}', 'u': f'{c["slug"]}.html#p{i}'})
    paginas = ['preguntas.html'] + sorted(f.name for f in ROOT.glob('*.html') if f.name not in ('preguntas.html', 'index.html', 'creditos.html')) + ['index.html']
    for pagina in paginas:
        archivo = './' if pagina == 'index.html' else pagina
        s = (ROOT / pagina).read_text(encoding='utf-8')
        for pid, q, a in re.findall(r'<details id="(p-[^"]+)"><summary>(.*?)<span class="plus".*?<div class="answer">(.*?)</div></details>', s, re.S):
            if any(x['t'] == texto_plano(q) and x['g'] == 'Preguntas' for x in items):
                continue
            items.append({'g': 'Preguntas', 't': texto_plano(q), 's': texto_plano(a)[:150], 'u': f'{archivo}#{pid}'})
    for n in N.NORMAS:
        items.append({'g': 'Normativa', 't': f'{n["corto"]}: {n["nombre"]}', 's': n.get('oficial', ''), 'u': f'{n["slug"]}.html'})
        for num, nota in n.get('articulos', []):
            items.append({'g': 'Normativa', 't': f'{n["corto"]}, art. {num}: {nota}', 'u': f'{n["slug"]}.html#art-{num}'})
    for a, b, c in MEDIDAS:
        items.append({'g': 'Tamaños', 't': a, 's': f'{b} · {c}', 'u': 'tamano-de-los-aparatos.html#h-medidas'})
    (ROOT / 'assets/campanas/ayuda-indice.json').write_text(json.dumps(items, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return len(items)


def main():
    for nombre in ('index.html', 'preguntas.html', 'creditos.html'):
        p = ROOT / nombre
        s = p.read_text(encoding='utf-8')
        if nombre == 'creditos.html':  # la ficha flotante es la de preguntas.html, ya al día
            s = con_ficha(s, (ROOT / 'preguntas.html').read_text(encoding='utf-8'))
        p.write_text(con_ck_ficha(con_tamanos(con_etapas(con_menu(s)))), encoding='utf-8')
        print('ok menú', nombre)
    base = N.plantilla()
    for g in GUIAS:
        (ROOT / f'{g["slug"]}.html').write_text(pagina_guia(g, base), encoding='utf-8')
        print('ok', g['slug'])
    for c in CHECKLISTS:
        (ROOT / f'{c["slug"]}.html').write_text(pagina_checklist(c, base), encoding='utf-8')
        print('ok', c['slug'])
    actualizar_sitemap()
    actualizar_llms()
    print('ok sitemap.xml y llms.txt')
    N.main()  # las normas copian la cabecera de preguntas.html, ya con el panel
    for f in sorted(ROOT.glob('*.html')):
        t = f.read_text(encoding='utf-8')
        u = con_ids(t)
        if u != t:
            f.write_text(u, encoding='utf-8')
    print('ok buscador:', indice_busqueda(), 'entradas')


if __name__ == '__main__':
    main()
