# services/tasks.py
import re, random
from typing import Dict, List
from sklearn.feature_extraction.text import TfidfVectorizer

def _key_noun_phrases(text: str) -> List[str]:
    # simple: TF-IDF over sentences to pick keywords; then keep nouns-ish tokens
    sents = re.split(r"(?<=[.!?])\s+", text)
    vect = TfidfVectorizer(stop_words="english", ngram_range=(1,2))
    try:
        X = vect.fit_transform(sents)
    except ValueError:
        return []
    vocab = vect.get_feature_names_out()
    scores = X.sum(axis=0).A1
    pairs = sorted(zip(vocab, scores), key=lambda x: -x[1])
    candidates = [w for w,_ in pairs if re.match(r"[A-Za-z][A-Za-z-]*$", w)]
    # filter too short
    return [w for w in candidates if len(w) > 3][:5]

def make_cloze(text: str) -> Dict:
    keys = _key_noun_phrases(text)
    for k in keys:
        if re.search(rf"\b{k}\b", text, flags=re.IGNORECASE):
            blanked = re.sub(rf"\b{k}\b", "_____", text, flags=re.IGNORECASE, count=1)
            return {"type": "cloze", "prompt": blanked, "answer": k}
    # fallback: blank first 5-letter word
    m = re.search(r"\b([A-Za-z]{5,})\b", text)
    if not m: 
        return {"type": "cloze", "prompt": text, "answer": ""}
    k = m.group(1)
    return {"type": "cloze", "prompt": re.sub(rf"\b{k}\b", "_____", text, count=1), "answer": k}

def make_check2(text: str) -> Dict:
    # true: exact sentence; false: minimal negation or swapped number/quantifier
    sents = re.split(r"(?<=[.!?])\s+", text.strip())
    true = max(sents, key=len) if sents else text
    false = re.sub(r"\b(increase|increases|increased)\b", "decreases", true, flags=re.IGNORECASE)
    if false == true:
        false = re.sub(r"\b(\d+)\b", lambda m: str(int(m.group(1))+1), true, count=1)
    if false == true:
        false = "It is not true that " + true[:1].lower() + true[1:]
    opts = [true, false]
    random.shuffle(opts)
    return {"type": "check2", "question": "Which statement is correct?", "options": opts, "answer_idx": opts.index(true)}

def make_summary_ref(text: str) -> Dict:
    # naive reference summary = first sentence clipped to ~25 words
    sent = re.split(r"(?<=[.!?])\s+", text.strip())[0] if text.strip() else ""
    words = sent.split()
    ref = " ".join(words[:25])
    return {"type": "summary1", "prompt": "Write a one-line summary.", "reference": ref}

def generate_tasks_for_chunk(text: str, difficulty: str) -> List[Dict]:
    tasks = [make_cloze(text), make_check2(text), make_summary_ref(text)]
    for t in tasks:
        t["difficulty"] = difficulty
    return tasks
