#!/usr/bin/env python3
"""Arma el plugin de WordPress de Campañas de recolección: código de wordpress/campanas-sitio/ + el sitio.

    python3 tools/wordpress.py [destino]

Sin destino, deja la carpeta del plugin y su .zip junto a este repositorio: ../wordpress/campanas-sitio y
../wordpress/campanas-sitio.zip (fuera del repositorio: GitHub Pages publica todo lo que está dentro). El sitio va en
sitio/: las páginas (*.html), assets/ y llms.txt. Se instala en WordPress con Plugins → Añadir nuevo → Subir plugin;
los ajustes quedan en el menú «Campañas».
"""
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGEN = ROOT / 'wordpress' / 'campanas-sitio'


def main():
    destino = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / 'wordpress'
    carpeta = destino / 'campanas-sitio'
    if carpeta.exists():
        shutil.rmtree(carpeta)
    shutil.copytree(ORIGEN, carpeta, ignore=shutil.ignore_patterns('sitio', '.DS_Store'))
    sitio = carpeta / 'sitio'
    sitio.mkdir()
    n = 0
    for f in sorted(ROOT.glob('*.html')):
        shutil.copy2(f, sitio / f.name)
        n += 1
    shutil.copy2(ROOT / 'llms.txt', sitio / 'llms.txt')
    shutil.copytree(ROOT / 'assets', sitio / 'assets', ignore=shutil.ignore_patterns('.DS_Store'))
    n += sum(1 for p in (sitio / 'assets').rglob('*') if p.is_file()) + 1
    archivo = destino / 'campanas-sitio.zip'
    with zipfile.ZipFile(archivo, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(carpeta.rglob('*')):
            if p.is_file():
                z.write(p, p.relative_to(destino))
    print(f'{n} archivos del sitio')
    print(carpeta)
    print(f'{archivo}  {archivo.stat().st_size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
