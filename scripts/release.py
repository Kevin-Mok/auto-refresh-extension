#!/usr/bin/env python3
"""Build or inspect the exact runtime files for Chrome Web Store submission."""
import argparse
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import posixpath
import re
import stat
import struct
import sys
from urllib.parse import unquote, urlsplit
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FILES = {'manifest.json', 'popup.html', 'popup.css', 'help.html', 'privacy.html', 'public.css',
         'src/background.js', 'src/engine.js', 'src/content.js', 'src/popup.js', 'src/rules.js',
         *(f'icons/refresh-{size}.png' for size in (16, 32, 48, 128))}


def local_ref(files, owner, ref, external=False):
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc:
        if not external:
            raise ValueError(f'{owner}: dependency must be local: {ref}')
        return
    if not parsed.path:
        return
    path = unquote(parsed.path)
    target = posixpath.normpath(posixpath.join(posixpath.dirname(owner), path))
    if path.startswith('/') or '\\' in path or target not in files:
        raise ValueError(f'{owner}: missing or unsafe local dependency: {ref}')


class References(HTMLParser):
    def __init__(self, files, owner):
        super().__init__()
        self.files, self.owner = files, owner

    def handle_starttag(self, tag, attributes):
        for key, ref in attributes:
            if key in ('src', 'href') and ref:
                local_ref(self.files, self.owner, ref, external=tag == 'a')


def validate(files):
    if set(files) != FILES:
        raise ValueError(f'Missing required files: {", ".join(sorted(FILES - files.keys()))}')
    manifest = json.loads(files['manifest.json'])
    if manifest.get('manifest_version') != 3:
        raise ValueError('Expected Manifest V3')
    version = manifest.get('version', '')
    if not isinstance(version, str) or not re.fullmatch(r'\d+(?:\.\d+){0,3}', version):
        raise ValueError('Invalid manifest version')
    parts = version.split('.')
    if any(int(p) > 65535 or (len(p) > 1 and p.startswith('0')) for p in parts) or not any(map(int, parts)):
        raise ValueError('Invalid manifest version')
    if manifest.get('background') != {'service_worker': 'src/background.js', 'type': 'module'}:
        raise ValueError('Expected packaged module service worker src/background.js')
    if manifest.get('action', {}).get('default_popup') != 'popup.html':
        raise ValueError('Expected packaged popup.html')
    icons = {str(s): f'icons/refresh-{s}.png' for s in (16, 32, 48, 128)}
    if manifest.get('icons') != icons or manifest.get('action', {}).get('default_icon') != icons:
        raise ValueError('Expected all four packaged refresh icons')
    for name, data in files.items():
        if name.endswith('.html'):
            References(files, name).feed(data.decode())
        elif name.endswith('.css'):
            source = data.decode()
            for ref in re.findall(r'''url\(\s*["']?([^\s)"']+)''', source):
                local_ref(files, name, ref)
            for ref in re.findall(r'''@import\s+["']([^"']+)["']''', source):
                local_ref(files, name, ref)
        elif name.endswith('.js'):
            source = data.decode()
            for ref in re.findall(r'''(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']''', source):
                if not ref.startswith('.'):
                    raise ValueError(f'{name}: module dependency must be relative: {ref}')
                local_ref(files, name, ref)
            # executeScript files are not ES module imports.
            for refs in re.findall(r'\bfiles\s*:\s*\[([^]]*)\]', source):
                for ref in re.findall(r'''["']([^"']+)["']''', refs):
                    local_ref(files, 'manifest.json', ref)
        elif name.endswith('.png'):
            size = int(re.search(r'-(\d+)\.png$', name)[1])
            if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR' or struct.unpack('>II', data[16:24]) != (size, size):
                raise ValueError(f'{name}: expected a {size}x{size} PNG')
    return manifest


def read_archive(data):
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(info.file_size for info in archive.infolist()) > 20_000_000:
            raise ValueError('Archive exceeds 20 MB limit')
        for info in archive.infolist():
            name = info.filename
            if name not in FILES:
                raise ValueError(f'Unapproved archive entry: {name}')
            if name in files:
                raise ValueError(f'Duplicate archive entry: {name}')
            if stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError(f'Symlink is not allowed: {name}')
            files[name] = archive.read(info)
    return validate(files), files


def no_symlinks(path):
    for current in (path, *path.parents):
        if current.is_symlink():
            raise ValueError(f'Source/output symlink is not allowed: {current}')


def package():
    files = {}
    for name in sorted(FILES):
        source = ROOT / name
        no_symlinks(source)
        files[name] = source.read_bytes()
    manifest = validate(files)
    content = io.BytesIO()
    with zipfile.ZipFile(content, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    data = content.getvalue()
    _, files = read_archive(data)
    destination = ROOT / 'artifacts' / f'auto-refresh-cache-{manifest["version"]}'
    zip_path = destination.with_suffix(destination.suffix + '.zip')
    no_symlinks(destination)
    no_symlinks(zip_path)
    if destination.exists():
        entries = {p.relative_to(destination).as_posix(): p for p in destination.rglob('*') if not p.is_dir() or p.is_symlink()}
        if set(entries) != FILES or any(p.is_symlink() or not p.is_file() or p.read_bytes() != files[name] for name, p in entries.items()):
            raise ValueError(f'Refusing to overwrite changed installation folder: {destination}; use a new manifest version or move it aside')
    else:
        destination.mkdir(parents=True)
        for name, payload in files.items():
            target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
    zip_path.write_bytes(data)
    return zip_path, data, destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('package', help='Build validated ZIP and unpacked install folder')
    inspect = commands.add_parser('inspect', help='Validate a release ZIP')
    inspect.add_argument('zip', type=Path)
    for command in (build, inspect):
        command.add_argument('--plain', action='store_true', help='ASCII output')
    args = parser.parse_args()

    def say(message, emoji='✅'):
        print(message if args.plain else f'{emoji} {message}', flush=True)

    try:
        say('Preparing extension package...' if args.command == 'package' else 'Inspecting extension package...', '📦')
        if args.command == 'package':
            path, data, folder = package()
            say(f'Unpacked install folder: {folder}', '📁')
        else:
            path = args.zip.absolute()
            data = path.read_bytes()
        manifest, files = read_archive(data)
        say(f'{manifest["name"]} {manifest["version"]}', '📋')
        say(f'Validated {len(files)} allowlisted files, local dependencies, and icon dimensions')
        say(f'ZIP: {path}', '📁')
        say(f'Size: {len(data):,} bytes', '📏')
        say(f'SHA256: {hashlib.sha256(data).hexdigest()}', '🔐')
        return 0
    except (OSError, ValueError, KeyError, TypeError, AttributeError, UnicodeError, zipfile.BadZipFile, RuntimeError) as error:
        print(f'{"Error:" if args.plain else "❌ Error:"} {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
