"""Reject private runtime files, source archives and flattened frontend uploads in Git."""

import subprocess
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DIRECTORIES = {'.local', 'storage', 'output', 'node_modules', '.next', '.venv'}
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
        if private or environment or archive or flattened:
            rejected.append(name)
    return sorted(rejected)


def main():
    result = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, check=True, capture_output=True)
    rejected = prohibited_paths(result.stdout.decode('utf-8').split('\0'))
    if rejected:
        print('Repository hygiene failed; remove private/generated or misplaced files from the tracked source:')
        for name in rejected:
            print(name)
        return 1
    print('Repository hygiene passed: no tracked private files, source archives or flattened frontend uploads.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
