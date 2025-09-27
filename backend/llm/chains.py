# llm/chains.py
import os, json
from typing import List, Dict
from langchain_openai import ChatOpenAI
from .prompts import SEGMENT_PROMPT, BOSS_PROMPT

def _llm():
    return ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

def refine_segments(raw_text: str) -> List[Dict]:
    llm = _llm()
    prompt = SEGMENT_PROMPT.format(raw=raw_text)
    out = llm.invoke(prompt).content
    try:
        return json.loads(out)
    except Exception:
        return [{"text": raw_text, "cognitive_load": 3, "rationale": "fallback"}]

def make_boss_questions(chunks_text: List[str]) -> List[Dict]:
    llm = _llm()
    prompt = BOSS_PROMPT.format(chunks="\n\n".join(chunks_text[:6]))
    out = llm.invoke(prompt).content
    try:
        return json.loads(out)
    except Exception:
        return []
