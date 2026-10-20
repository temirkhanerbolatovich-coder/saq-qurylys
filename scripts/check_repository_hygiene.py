"""Check source hygiene, local documentation targets, JSON and narrow secret signatures."""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DIRECTORIES = {
    '.local',
    'storage',
    'output',
    'node_modules',
    '.next',
    '.venv',
    '__pycache__',
    '.pytest_cache',
    '.ruff_cache',
    'test-results',
    'playwright-report',
}
ROOT_FRONTEND_CONFIGS = {
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next.config.ts',
    'next.config.js',
    'postcss.config.mjs',
    'eslint.config.mjs',
    'playwright.config.ts',
}


def prohibited_paths(paths):
    """Inspect names only, so a rejected configuration never exposes its values."""
    rejected = []
    for name in paths:
        path = PurePosixPath(name)
        private = bool(PRIVATE_DIRECTORIES.intersection(path.parts))
        environment = (path.name == '.env' or path.name.startswith('.env.')) and path.name != '.env.example'
        archive = path.name.lower().endswith(('.zip', '.tar', '.tar.gz', '.7z', '.rar'))
        flattened = len(path.parts) == 1 and (path.suffix in {'.tsx', '.css'} or path.name in ROOT_FRONTEND_CONFIGS)
        database = path.suffix.lower() in {'.dump', '.sqlite', '.sqlite3'}
        if private or environment or archive or flattened or database:
            rejected.append(name)
    return sorted(rejected)


SECRET_SIGNATURES = {
    'private key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'GitHub credential': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})\b'),
    'AWS credential': re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
    'Telegram credential': re.compile(r'\b\d{8,12}:[A-Za-z0-9_-]{30,}\b'),
}


def secret_findings(content):
    """Return only category/line, never matched credentials or surrounding text."""
    return [
        (label, content.count('\n', 0, match.start()) + 1)
        for label, signature in SECRET_SIGNATURES.items()
        for match in signature.finditer(content)
    ]


def missing_markdown_targets(root, name, content, allowed=None):
    """Check local file targets; external URLs, anchors and fenced examples are not fetched."""
    content = re.sub(r'(?ms)^```.*?^```[^\n]*', '', content)
    missing = []
    for match in re.finditer(r'\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)', content):
        target = urlsplit(match.group(1).strip('<>'))
        if target.scheme or not target.path or target.path.startswith('//'):
            continue
        path = unquote(target.path)
        if any(character in path for character in '<>*{}'):
            continue
        resolved = (root / name).parent.joinpath(path).resolve()
        if not resolved.exists():
            missing.append(path)
        elif allowed is not None:
            try:
                relative = resolved.relative_to(root.resolve()).as_posix()
            except ValueError:
                missing.append(path)
                continue
            if relative not in allowed and not any(
                candidate.startswith(relative.rstrip('/') + '/') for candidate in allowed
            ):
                missing.append(path)

    return missing


def inspect_files(root, names):
    """Inspect the current source tree; diagnostics contain paths and categories only."""
    problems = []
    allowed = set(names)
    for name in names:
        path = root / name
        if not path.is_file():
            continue
        raw = path.read_bytes()
        if b'\0' in raw:
            continue
        try:
            content = raw.decode('utf-8-sig')
        except UnicodeError:
            if path.suffix.lower() in {'.py', '.ts', '.tsx', '.mjs', '.json', '.yaml', '.yml', '.md', '.txt', '.ps1'}:
                problems.append(f'{name}: invalid UTF-8')
            continue
        problems.extend(
            f'{name}:{line}: possible {label}; value suppressed' for label, line in secret_findings(content)
        )
        if path.suffix == '.json' or name == 'contracts/openapi.yaml':
            try:
                json.loads(content)
            except ValueError:
                problems.append(f'{name}: invalid JSON')
        if path.suffix == '.md' and not name.startswith('.agents/'):
            problems.extend(
                f'{name}: missing local link target {target}'
                for target in missing_markdown_targets(root, name, content, allowed)
            )
    return problems


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--include-untracked', action='store_true', help='Also inspect non-ignored new source files.')
    args = parser.parse_args()
    command = ['git', 'ls-files', '-z', '--cached']
    if args.include_untracked:
        command += ['--others', '--exclude-standard']
    result = subprocess.run(command, cwd=ROOT, check=True, capture_output=True)
    names = sorted(set(filter(None, result.stdout.decode('utf-8').split('\0'))))
    rejected = prohibited_paths(names)
    if rejected:
        print('Repository hygiene failed; remove private/generated or misplaced files from the tracked source:')
        for name in rejected:
            print(name)
        return 1
    problems = inspect_files(ROOT, names)
    if problems:
        print('\n'.join(problems))
        return 1
    print(
        f'Repository hygiene passed: {len(names)} source paths; private artifacts, local links, JSON and narrow secret checks.'
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
