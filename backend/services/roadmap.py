# services/roadmap.py
from typing import List, Dict

def build_linear_roadmap(chunks: List[Dict], boss_every: int = 5) -> Dict:
    nodes, edges = [], []
    for i, ch in enumerate(chunks, start=1):
        hid = f"h{i}"
        nodes.append({"id": hid, "type": "hurdle", "chunkIdx": ch["idx"], "diff": ch["difficulty"]})
        if i > 1:
            edges.append([f"h{i-1}", hid])
        if i % boss_every == 0:
            bid = f"b{i//boss_every}"
            nodes.append({"id": bid, "type": "boss", "covers": list(range(i-boss_every+1, i+1)), "minScore": 0.75})
            edges.append([hid, bid])
    return {"nodes": nodes, "edges": edges}
