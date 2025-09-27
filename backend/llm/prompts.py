# llm/prompts.py
from langchain.prompts import PromptTemplate

SEGMENT_PROMPT = PromptTemplate.from_template("""
You are refining study chunks from a PDF section.
If the text is too long, split into 1–3 coherent mini-chunks.
For each mini-chunk, output JSON with:
- "text": the cleaned chunk (<= 180 tokens)
- "cognitive_load": 1..5 (1=very easy, 5=very hard)
- "rationale": one short reason
Text:
Return a JSON array only.
""")

BOSS_PROMPT = PromptTemplate.from_template("""
Create 4 short assessment questions mixing 'why/how/compare' that are answerable from the provided chunks.
For each, output:
- "q": question
- "key": concise expected points (<= 30 words)
Chunks:
{chunks}
Return a JSON array.
""")
