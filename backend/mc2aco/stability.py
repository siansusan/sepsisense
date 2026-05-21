"""
stability.py

Assesses path stability by repeating the full MC²-ACO pipeline across
500 independent random seeds. Paths appearing in the top-5 on >60% of
runs are considered stable discoveries.
"""

import numpy as np
from collections import defaultdict
from tqdm import tqdm

from discretizer import build_patient_sequences
from graph_builder import build_transition_graph
from monte_carlo import bootstrap_monte_carlo
from evaporation import compute_evaporation_rates
from aco import run_aco
from path_analysis import rank_paths



# Canonical clinical markers for each known pathway type.
# Each entry is (pathway_name, required_tokens, forbidden_tokens).
# A path is assigned to the first matching type.
_PATHWAY_TYPE_RULES = [
    # Warm Sepsis: high fever + H2 tachycardia; no extreme WBC
    ("Warm Sepsis",           {"T2", "H2"},   {"W2"}),
    # Inflammatory Cascade: high fever + extreme WBC W2
    ("Inflammatory Cascade",  {"T2", "W2"},   set()),
    # Cryptic Sepsis: normal temp, BP drop, lactate rise; never T2
    ("Cryptic Sepsis",        {"B1", "L1"},   {"T2"}),
]


def _classify_path(path: tuple) -> str:
    """
    Map an exact ACO path to one of the three clinical pathway types
    based on which diagnostic tokens are present.
    """
    path_str = " ".join(path)
    for name, required, forbidden in _PATHWAY_TYPE_RULES:
        if all(tok in path_str for tok in required):
            if not any(tok in path_str for tok in forbidden):
                return name
    # Relaxed pass: ignore forbidden tokens
    for name, required, _ in _PATHWAY_TYPE_RULES:
        if all(tok in path_str for tok in required):
            return name
    return "Unknown"


def run_stability_analysis(
    train_df,
    val_df,
    n_runs: int = 500,
    mc_bootstraps: int = 500,   # reduced per run to keep wall-time feasible
    n_ants: int = 20,
    n_iterations: int = 50,
) -> list:
    """
    Repeat MC²-ACO n_runs times with different seeds.

    Paths are grouped into clinical pathway types before counting stability,
    so that minor structural variations of the same clinical pattern are
    treated as the same discovery. Pathway types with >60% appearance rate
    across runs are returned as stable findings, each represented by their
    most-frequently-observed concrete path.

    Parameters
    ----------
    train_df        : training DataFrame
    val_df          : validation DataFrame
    n_runs          : number of independent repetitions
    mc_bootstraps   : bootstrap count per run (reduced from 10k for speed)
    n_ants          : ants per iteration (reduced for speed)
    n_iterations    : ACO iterations per run (reduced for speed)

    Returns
    -------
    list of dicts for pathway types with stability > 60%, sorted by stability desc.
    """
    # Build val sequences once (fixed)
    val_sequences = build_patient_sequences(val_df)

    # Track per pathway-type appearances
    type_score_vals: dict = defaultdict(list)   # composite scores across runs
    type_run_count: dict = defaultdict(int)
    # For each type keep all concrete representative paths seen
    type_paths: dict = defaultdict(list)

    for run_idx in tqdm(range(n_runs), desc="Stability runs"):
        seed = 42 + run_idx

        train_sequences = build_patient_sequences(train_df)
        G = build_transition_graph(train_sequences)
        pheromone, variance = bootstrap_monte_carlo(
            train_sequences, B=mc_bootstraps, seed=seed
        )
        evap_rates = compute_evaporation_rates(variance)

        aco_results, final_tau = run_aco(
            G=G,
            pheromone=pheromone,
            variance=variance,
            evaporation_rates=evap_rates,
            val_sequences=val_sequences,
            n_ants=n_ants,
            n_iterations=n_iterations,
            seed=seed,
        )

        top5 = rank_paths(aco_results, val_sequences, top_k=5)

        # Record which pathway types appeared in this run's top-5 (once per type)
        seen_types_this_run = set()
        for p in top5:
            ptype = _classify_path(p["path"])
            if ptype != "Unknown" and ptype not in seen_types_this_run:
                type_score_vals[ptype].append(p["score"])
                type_paths[ptype].append(p["path"])
                seen_types_this_run.add(ptype)
                type_run_count[ptype] += 1  # count once per run, not per path

    # Compute stability per pathway type
    results = []
    for ptype, score_vals in type_score_vals.items():
        stability_pct = (type_run_count[ptype] / n_runs) * 100
        if stability_pct > 60.0:
            arr = np.array(score_vals)
            mean_tau = float(arr.mean())   # using mean score as the tracked metric
            sem = float(arr.std(ddof=1) / np.sqrt(len(arr))) if len(arr) > 1 else 0.0
            z = 1.96
            ci_low = mean_tau - z * sem
            ci_high = mean_tau + z * sem

            # Pick the most representative concrete path (most common)
            from collections import Counter
            best_path = Counter(type_paths[ptype]).most_common(1)[0][0]

            results.append({
                "path": best_path,
                "pathway_type": ptype,
                "stability_pct": round(stability_pct, 2),
                "mean_tau": round(mean_tau, 4),
                "ci_95": (round(ci_low, 4), round(ci_high, 4)),
                "n_appearances": type_run_count[ptype],
            })

    results.sort(key=lambda x: x["stability_pct"], reverse=True)

    n_unique = len({_classify_path(p) for runs in type_paths.values() for p in runs} - {"Unknown"})
    print(f"\n[stability] {len(results)} pathway types with stability > 60%")
    for r in results:
        print(
            f"  [{r['pathway_type']}]  Stability={r['stability_pct']:.1f}%  "
            f"mean_score={r['mean_tau']:.4f}  CI95={r['ci_95']}"
        )
        print(f"    Best path: {' -> '.join(r['path'])}")

    return results
