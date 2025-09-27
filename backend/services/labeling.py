# services/labeling.py
from textstat import flesch_kincaid_grade
import re, math
from typing import Dict

def _jargon_ratio(text: str) -> float:
    # very rough: fraction of tokens with length >= 10 or CamelCase/ALLCAPS
    toks = re.findall(r"[A-Za-z]+", text)
    if not toks: return 0.0
    hard = [t for t in toks if len(t) >= 10 or re.match(r"[A-Z][a-z]+[A-Z][A-Za-z]+", t) or t.isupper()]
    return len(hard) / len(toks)

def _entity_like(text: str) -> int:
    # simple proxy: counts of capitalized words not at sentence start
    return len(re.findall(r"\b[A-Z][a-zA-Z]+\b", text))

def difficulty_heuristic(text: str) -> Dict:
    fk = flesch_kincaid_grade(text or "a.")
    jr = _jargon_ratio(text)
    en = _entity_like(text)
    # score ~ higher is harder
    score = (fk / 12.0) + (jr * 2.0) + (min(en, 10) / 10.0)
    # map: <=0.9 E, <=1.6 M, else H
    if score <= 0.9: diff = "E"
    elif score <= 1.6: diff = "M"
    else: diff = "H"
    return {"fkgl": fk, "jargon": jr, "entities": en, "score": score, "difficulty": diff}
