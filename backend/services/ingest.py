# services/ingest.py
import hashlib, fitz, re
from typing import List, Dict

def extract_blocks(pdf_path: str) -> List[Dict]:
    doc = fitz.open(pdf_path)
    blocks = []
    for pno in range(len(doc)):
        page = doc[pno]
        text = page.get_text("text")
        # naive paragraph split
        paras = [re.sub(r"\s+\n", "\n", para).strip() for para in text.split("\n\n") if para.strip()]
        for para in paras:
            blocks.append({"page": pno+1, "text": para})
    return blocks

def greedy_chunk(blocks: List[Dict], target_chars=800, max_chars=1200):
    chunks, cur, cur_pages = [], [], set()
    for b in blocks:
        t = b["text"]
        if sum(len(x["text"]) for x in cur) + len(t) <= max_chars:
            cur.append(b)
            cur_pages.add(b["page"])
            if sum(len(x["text"]) for x in cur) >= target_chars:
                chunks.append({"text": "\n".join(x["text"] for x in cur),
                               "pages": sorted(list(cur_pages))})
                cur, cur_pages = [], set()
        else:
            if cur:
                chunks.append({"text": "\n".join(x["text"] for x in cur),
                               "pages": sorted(list(cur_pages))})
            cur, cur_pages = [b], {b["page"]}
    if cur:
        chunks.append({"text": "\n".join(x["text"] for x in cur),
                       "pages": sorted(list(cur_pages))})
    # add hashes
    for c in chunks:
        c["hash"] = hashlib.sha1(c["text"].encode("utf-8")).hexdigest()
    return chunks
