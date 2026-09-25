#!/usr/bin/env python3
"""
Скрипт для обновления путей в HTML файлах после реорганизации структуры проекта
"""
import os
import re
from pathlib import Path

def update_html_file(filepath):
    """Обновляет пути в HTML файле"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Обновляем пути к CSS файлам
    content = re.sub(r'href="site-header\.css"', 'href="../styles/site-header.css"', content)
    content = re.sub(r'href="site-footer\.css"', 'href="../styles/site-footer.css"', content)

    # Обновляем пути к JS файлам
    content = re.sub(r'src="site-footer\.js"', 'src="../scripts/site-footer.js"', content)
    content = re.sub(r'src="site-i18n\.js"', 'src="../scripts/site-i18n.js"', content)
    content = re.sub(r'src="site-currency\.js"', 'src="../scripts/site-currency.js"', content)
    content = re.sub(r'src="site-orbs\.js"', 'src="../scripts/site-orbs.js"', content)
    content = re.sub(r'src="site-catalog\.js"', 'src="../scripts/site-catalog.js"', content)
    content = re.sub(r'src="catalog\.js"', 'src="../scripts/catalog.js"', content)
    content = re.sub(r'src="scripts\.js"', 'src="../scripts/scripts.js"', content)
    content = re.sub(r'src="products\.js"', 'src="../scripts/products.js"', content)
    content = re.sub(r'src="auth\.js"', 'src="../scripts/auth.js"', content)
    content = re.sub(r'src="admin\.js"', 'src="../scripts/admin.js"', content)
    content = re.sub(r'src="reviews\.js"', 'src="../scripts/reviews.js"', content)
    content = re.sub(r'src="exploits\.js"', 'src="../scripts/exploits.js"', content)
    content = re.sub(r'src="infinite-yield\.js"', 'src="../scripts/infinite-yield.js"', content)
    content = re.sub(r'src="chilli-hub\.js"', 'src="../scripts/chilli-hub.js"', content)
    content = re.sub(r'src="capture_thumbnail\.js"', 'src="../scripts/capture_thumbnail.js"', content)

    # Обновляем пути к изображениям в assets
    content = re.sub(r'src="assets/', 'src="../assets/', content)
    content = re.sub(r'href="assets/', 'href="../assets/', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    pages_dir = Path('/sessions/keen-serene-knuth/mnt/site/pages')

    if not pages_dir.exists():
        print(f"Папка {pages_dir} не найдена!")
        return

    updated_count = 0
    for html_file in pages_dir.glob('*.html'):
        if update_html_file(html_file):
            print(f"✓ Обновлен: {html_file.name}")
            updated_count += 1
        else:
            print(f"- Без изменений: {html_file.name}")

    print(f"\nВсего обновлено файлов: {updated_count}")

if __name__ == '__main__':
    main()
