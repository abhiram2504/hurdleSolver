# services/scoring.py
def score_attempt(correct: bool, time_ms: int, combo: int) -> int:
    base = 10 if correct else 0
    seconds = max(0, time_ms / 1000.0)
    speed_bonus = int(max(0, 5 - seconds) * 2)  # cap ~10
    combo_bonus = combo // 3
    return base + speed_bonus + combo_bonus
