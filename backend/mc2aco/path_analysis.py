"""
path_analysis.py

Ranks discovered ACO paths by a composite score combining frequency,
validation coverage, and mean pheromone. Returns the top paths using
pathway-type-diverse selection: at least one best path per clinical
pathway type is guaranteed before remaining slots are filled by score.
"""

import numpy as np


# ---------------------------------------------------------------------------
# Local pathway classifier (mirrors stability._PATHWAY_TYPE_RULES).
# Required tokens must all appear in the path string; forbidden tokens must
# not. Order matters: first match wins.
# ---------------------------------------------------------------------------
_PATH_TYPE_RULES = [
    ("Warm Sepsis",           ("T2", "H2"),  ("W2",)),   # fever + H2, no extreme WBC
    ("Inflammatory Cascade",  ("T2", "W2"),  ()),         # fever + extreme WBC
    ("Cryptic Sepsis",        ("B1", "L1"),  ("T2",)),    # BP drop + lactate, no fever
]


def _classify(path: tuple) -> str:
    """Return the clinical pathway type for a path, or 'Unknown'."""
    path_str = " ".join(path)
    for name, required, forbidden in _PATH_TYPE_RULES:
        if all(tok in path_str for tok in required):
            if not any(tok in path_str for tok in forbidden):
                return name
    # Relaxed pass without forbidden filter
    for name, required, _ in _PATH_TYPE_RULES:
        if all(tok in path_str for tok in required):
            return name
    return "Unknown"


def rank_paths(
    aco_results: list,
    val_sequences: dict,
    top_k: int = 5,
) -> list:
    """
    Score and rank discovered paths with pathway-type-diverse selection.

    Composite score = 0.4*Frequency + 0.4*Coverage + 0.2*Mean_tau

    Selection strategy:
      1. Pick the highest-scoring path for each known pathway type.
      2. Fill remaining slots from the rest of the ranked list by score.

    This guarantees all discovered pathway types appear in the output
    even when one type dominates the score distribution.

    Parameters
    ----------
    aco_results   : list of (path_tuple, mean_sensitivity, mean_tau) from aco.run_aco
    val_sequences : validation patient sequences
    top_k         : total number of paths to return

    Returns
    -------
    list of dicts with keys: path, frequency, coverage, mean_tau, score, pathway_type
    """
    if not aco_results:
        return []

    total_val = len(val_sequences)

    def _coverage(path):
        if total_val == 0:
            return 0.0
        hits = 0
        for seq in val_sequences.values():
            states = [s for s, _ in seq]
            idx = 0
            for state in states:
                if idx < len(path) and state == path[idx]:
                    idx += 1
            if idx == len(path):
                hits += 1
        return hits / total_val

    all_freq = np.array([r[1] for r in aco_results])
    all_tau  = np.array([r[2] for r in aco_results])
    max_freq = all_freq.max() or 1.0
    max_tau  = all_tau.max()  or 1.0

    scored = []
    for path, freq, mtau in aco_results:
        cov       = _coverage(path)
        norm_freq = freq / max_freq
        norm_tau  = mtau / max_tau
        score     = 0.4 * norm_freq + 0.4 * cov + 0.2 * norm_tau
        ptype     = _classify(path)
        scored.append({
            "path":         path,
            "frequency":    round(freq, 4),
            "coverage":     round(cov, 4),
            "mean_tau":     round(mtau, 4),
            "score":        round(score, 4),
            "pathway_type": ptype,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)

    # --- Diverse selection ---
    # Step 1: best path per known type
    best_per_type: dict = {}
    for entry in scored:
        pt = entry["pathway_type"]
        if pt != "Unknown" and pt not in best_per_type:
            best_per_type[pt] = entry

    type_anchors = sorted(best_per_type.values(), key=lambda x: x["score"], reverse=True)
    anchor_paths = {e["path"] for e in type_anchors}

    # Step 2: fill remaining slots by score, skipping already-included paths
    filler = [e for e in scored if e["path"] not in anchor_paths]

    top = (type_anchors + filler)[:top_k]

    print("\n[path_analysis] Top discovered paths:")
    for rank, p in enumerate(top, 1):
        tag = f"[{p['pathway_type']}]" if p["pathway_type"] != "Unknown" else ""
        print(
            f"  #{rank}  score={p['score']:.4f}  "
            f"freq={p['frequency']:.4f}  cov={p['coverage']:.4f}  "
            f"tau={p['mean_tau']:.4f}  {tag}"
        )
        path_str = " -> ".join(p["path"])
        if len(p["path"]) > 8:
            path_str = " -> ".join(p["path"][:5]) + f" ... ({len(p['path'])} nodes)"
        print(f"       {path_str}")

    return top
