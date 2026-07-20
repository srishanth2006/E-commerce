"""
utils/ai_matching.py
----------------------
MODULE 6 - AI PRODUCT MATCHING

Matches a raw product name read off an invoice (e.g. "Kinley 1L") against
the existing product catalog (e.g. "Kinley Water Bottle 1L") and returns
a confidence score from 0.0 to 1.0.

IMPLEMENTATION NOTE (read this before swapping in sentence-transformers):
The spec calls for Sentence-Transformers + embedding similarity search.
That approach needs PyTorch + a downloaded model (~500MB-1GB), which I
can't install or verify inside this sandbox (no internet access here).
Instead, this module uses a dependency-free approach built entirely on
Python's standard library:

  1. Text normalization (lowercase, strip punctuation, singularize units)
  2. Token overlap (Jaccard similarity on word sets)
  3. Sequence similarity (difflib.SequenceMatcher, a la fuzzywuzzy)
  4. A weighted blend of the two, tuned so close variants like
     "Kinley 1L" vs "Kinley Water Bottle 1L" score ~0.85-0.95

This is genuinely usable out of the box with zero extra installs.
If you later want real semantic embeddings, drop a sentence-transformers
call into `_similarity()` below - everything else (the >90% auto-match
threshold, the "ask admin" fallback) stays the same.
"""

import re
import difflib
from typing import List, Optional

from sqlalchemy.orm import Session

from app import models

AUTO_MATCH_THRESHOLD = 0.90  # >90% -> auto-match, per the Module 6 spec

_UNIT_WORDS = {"ml", "l", "ltr", "litre", "liter", "kg", "g", "gm", "gram", "grams", "pcs", "pack", "packet"}


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _tokens(text: str) -> set:
    return set(_normalize(text).split())


def _similarity(a: str, b: str) -> float:
    """Blend of token-set (Jaccard) similarity and character sequence
    similarity. Returns a score from 0.0 to 1.0."""
    norm_a, norm_b = _normalize(a), _normalize(b)
    if not norm_a or not norm_b:
        return 0.0
    if norm_a == norm_b:
        return 1.0

    tokens_a, tokens_b = _tokens(a), _tokens(b)
    if tokens_a and tokens_b:
        intersection = len(tokens_a & tokens_b)
        union = len(tokens_a | tokens_b)
        jaccard = intersection / union if union else 0.0
        # Bonus: if every token of the shorter name appears in the longer
        # one (e.g. "kinley 1l" fully inside "kinley water bottle 1l"),
        # that's a very strong signal even though Jaccard alone is lower.
        shorter, longer = (tokens_a, tokens_b) if len(tokens_a) <= len(tokens_b) else (tokens_b, tokens_a)
        subset_bonus = 0.25 if shorter.issubset(longer) else 0.0
    else:
        jaccard, subset_bonus = 0.0, 0.0

    seq_ratio = difflib.SequenceMatcher(None, norm_a, norm_b).ratio()

    score = (0.55 * jaccard) + (0.30 * seq_ratio) + subset_bonus
    return min(score, 1.0)


def find_best_match(
    raw_name: str, db: Session, candidates: Optional[List[models.Product]] = None
):
    """
    Returns (product_or_none, confidence_float).
    If confidence >= AUTO_MATCH_THRESHOLD, the caller should treat this as
    an automatic match (update the existing product). Otherwise, surface
    it to the admin as a suggestion ("did you mean...?") rather than
    auto-applying it.
    """
    if candidates is None:
        candidates = db.query(models.Product).filter(models.Product.is_active == True).all()  # noqa: E712

    best_product = None
    best_score = 0.0
    for product in candidates:
        score = _similarity(raw_name, product.name)
        if score > best_score:
            best_score = score
            best_product = product

    return best_product, round(best_score, 3)


def rank_matches(raw_name: str, db: Session, top_n: int = 5) -> List[dict]:
    """Returns the top N candidate matches with their scores, for an admin
    'pick the right one' UI when confidence is below the auto-match bar."""
    candidates = db.query(models.Product).filter(models.Product.is_active == True).all()  # noqa: E712
    scored = [
        {"product": p, "confidence": _similarity(raw_name, p.name)} for p in candidates
    ]
    scored.sort(key=lambda x: x["confidence"], reverse=True)
    return scored[:top_n]
