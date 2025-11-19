import random
import string
from sqlalchemy.orm import Session
from sqlalchemy import select
from . import models


def _random_slug(length: int = 6) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(random.choices(alphabet, k=length))


def generate_slug(db: Session, max_tries: int = 10) -> str:
    for _ in range(max_tries):
        slug = _random_slug()
        exists = db.execute(
            select(models.Session.id).where(models.Session.slug == slug)
        ).first()
        if not exists:
            return slug
    # Fallback: longer slug if too many collisions
    for _ in range(max_tries):
        slug = _random_slug(8)
        exists = db.execute(
            select(models.Session.id).where(models.Session.slug == slug)
        ).first()
        if not exists:
            return slug
    raise RuntimeError("Failed to generate unique slug")
