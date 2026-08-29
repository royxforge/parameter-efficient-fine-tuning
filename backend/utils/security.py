from pathlib import Path

from fastapi import HTTPException


def safe_child_path(base_dir: Path, name: str) -> Path:
    base = Path(base_dir).resolve()
    candidate = (base / name).resolve()
    if not candidate.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Invalid path")
    return candidate