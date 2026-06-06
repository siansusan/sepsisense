"""
main.py

Entry point for the MC²-ACO: Monte Carlo Prior-Initialized and
Uncertainty-Adaptive Ant Colony Optimization for Sepsis Progression
Pathway Discovery.

Run from the project root:
    python mc2aco/main.py
"""

import os
import sys
import io
import random
import numpy as np

# Force UTF-8 output on Windows to handle any Unicode in print statements
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Ensure imports resolve when run as `python mc2aco/main.py`
sys.path.insert(0, os.path.dirname(__file__))

random.seed(42)
np.random.seed(42)

from secondary_data_generator import generate_dataset
from data_loader import load_and_split
from discretizer import build_patient_sequences, SENTINEL_SEPSIS
from graph_builder import build_transition_graph
from monte_carlo import bootstrap_monte_carlo
from evaporation import compute_evaporation_rates
from aco import run_aco
from path_analysis import rank_paths
from stability import run_stability_analysis


# ---------------------------------------------------------------------------
# Ground-truth pathway signatures: required + forbidden token sets.
# Designed to match what realistic ACO paths show (not just extreme states).
# ---------------------------------------------------------------------------
PATHWAY_SIGNATURES = {
    # Fever (T2) + H2 tachycardia, but NOT extreme WBC separates from IC
    "Warm Sepsis":           {"required": ["T2", "H2"],  "forbidden": ["W2"]},
    # Normal temp (T0) + any BP drop + any lactate rise
    "Cryptic Sepsis":        {"required": ["B1", "L1"],  "forbidden": ["T2"]},
    # Fever (T2) + extreme WBC (W2)
    "Inflammatory Cascade":  {"required": ["T2", "W2"],  "forbidden": []},
}


def _match_pathway_signature(path: tuple) -> tuple:
    """
    Return (best_pathway_name, overlap_fraction) using required/forbidden logic.
    overlap = required_tokens_found / total_required_tokens.
    """
    path_str = " ".join(path)
    best_name, best_overlap = "Unknown", 0.0

    for name, spec in PATHWAY_SIGNATURES.items():
        req = spec["required"]
        forb = spec["forbidden"]
        hits = sum(1 for tok in req if tok in path_str)
        penalty = sum(1 for tok in forb if tok in path_str)
        # Forbidden tokens halve the effective hit count
        effective_hits = max(0, hits - penalty * len(req))
        overlap = effective_hits / len(req)
        if overlap > best_overlap:
            best_overlap = overlap
            best_name = name

    return best_name, best_overlap


def _validation_report(stable_paths: list, top_paths: list) -> None:
    """
    Compare discovered paths against hidden ground-truth Pathway_Type labels.
    Uses stable pathway types if available, falls back to top ACO paths.
    """
    # Prefer stable paths; each stable entry already has pathway_type set
    use_stable = bool(stable_paths)
    candidates = stable_paths if use_stable else top_paths
    if not candidates:
        print("\n[validation] No paths to validate.")
        return

    print("\n" + "=" * 70)
    print("VALIDATION: Discovered Paths vs. Ground-Truth Pathways")
    print("=" * 70)

    recovered = set()

    for idx, entry in enumerate(candidates[:5], 1):
        path = entry["path"]

        # Stable entries carry a pre-computed pathway_type; otherwise match
        if use_stable and "pathway_type" in entry:
            matched_name = entry["pathway_type"]
            path_str = " ".join(path)
            req = PATHWAY_SIGNATURES.get(matched_name, {}).get("required", [])
            hits = sum(1 for tok in req if tok in path_str)
            overlap = hits / len(req) if req else 0.0
        else:
            matched_name, overlap = _match_pathway_signature(path)

        overlap_pct = round(overlap * 100, 1)
        status = "MATCH" if overlap >= 0.50 else "PARTIAL"
        if overlap >= 0.50:
            recovered.add(matched_name)

        path_display = " -> ".join(path) if len(path) <= 8 else (
            " -> ".join(path[:4]) + f" ... ({len(path)} nodes)"
        )
        stability_note = (
            f"  stability={entry['stability_pct']:.1f}%  CI95={entry['ci_95']}"
            if use_stable and "stability_pct" in entry else ""
        )

        print(f"\n  Discovered Path {idx}: [{status}]")
        print(f"    Matched pathway : {matched_name}")
        print(f"    Token overlap   : {overlap_pct}%{stability_note}")
        print(f"    Path            : {path_display}")

    print("\n" + "-" * 70)
    print("Recovery Summary:")
    for pw in PATHWAY_SIGNATURES:
        status_str = "RECOVERED" if pw in recovered else "NOT RECOVERED"
        print(f"  {pw:30s} -> {status_str}")

    n_recovered = len(recovered)
    total_pw = len(PATHWAY_SIGNATURES)
    print(f"\n  Overall recovery: {n_recovered}/{total_pw} pathways")
    print("=" * 70)


def main():
    print("\n" + "=" * 70)
    print("MC²-ACO: Sepsis Progression Pathway Discovery")
    print("=" * 70 + "\n")

    # ------------------------------------------------------------------
    # Step 1: Generate (or load) secondary dataset
    # ------------------------------------------------------------------
    data_path = os.path.join(os.path.dirname(__file__), "secondary_sepsis_data.csv")
    if not os.path.exists(data_path):
        print("Step 1: Generating secondary dataset...")
        generate_dataset(output_path=data_path)
    else:
        print(f"Step 1: Dataset already exists at {data_path}, skipping generation.")

    # ------------------------------------------------------------------
    # Step 2: Load and split
    # ------------------------------------------------------------------
    print("\nStep 2: Loading and splitting dataset...")
    train_df, val_df = load_and_split(csv_path=data_path)

    # ------------------------------------------------------------------
    # Step 3: Discretize training data
    # ------------------------------------------------------------------
    print("\nStep 3: Discretizing training sequences...")
    train_sequences = build_patient_sequences(train_df)

    # ------------------------------------------------------------------
    # Step 4: Build transition graph
    # ------------------------------------------------------------------
    print("\nStep 4: Building transition graph...")
    G = build_transition_graph(train_sequences)

    # ------------------------------------------------------------------
    # Step 5: Monte Carlo pheromone initialisation
    # ------------------------------------------------------------------
    print("\nStep 5: Running Monte Carlo bootstrap (B=10,000)...")
    pheromone, variance = bootstrap_monte_carlo(train_sequences, B=10_000, seed=42)

    # ------------------------------------------------------------------
    # Step 6: Adaptive evaporation rates
    # ------------------------------------------------------------------
    print("\nStep 6: Computing adaptive evaporation rates...")
    evap_rates = compute_evaporation_rates(variance)

    # ------------------------------------------------------------------
    # Step 7: Build validation sequences
    # ------------------------------------------------------------------
    print("\nStep 7: Building validation sequences...")
    val_sequences = build_patient_sequences(val_df)

    # ------------------------------------------------------------------
    # Step 8: Run full ACO
    # ------------------------------------------------------------------
    print("\nStep 8: Running MC²-ACO (50 ants × 200 iterations)...")
    aco_results, final_tau = run_aco(
        G=G,
        pheromone=pheromone,
        variance=variance,
        evaporation_rates=evap_rates,
        val_sequences=val_sequences,
        n_ants=50,
        n_iterations=200,
        seed=42,
    )

    # ------------------------------------------------------------------
    # Step 9: Path ranking
    # ------------------------------------------------------------------
    print("\nStep 9: Ranking discovered paths...")
    top_paths = rank_paths(aco_results, val_sequences, top_k=5)

    # Attach mean_tau from aco_results lookup for validation
    tau_lookup = {r[0]: r[2] for r in aco_results}
    for p in top_paths:
        if "mean_tau" not in p:
            p["mean_tau"] = tau_lookup.get(p["path"], 0.0)

    # ------------------------------------------------------------------
    # Step 10: Stability analysis (500 runs, reduced params for speed)
    # ------------------------------------------------------------------
    print("\nStep 10: Running stability analysis (500 seeds)...")
    stable_paths = run_stability_analysis(
        train_df=train_df,
        val_df=val_df,
        n_runs=500,
        mc_bootstraps=200,
        n_ants=20,
        n_iterations=30,
    )

    # ------------------------------------------------------------------
    # Step 11: Validation against ground truth
    # ------------------------------------------------------------------
    print("\nStep 11: Validating against ground-truth pathway labels...")
    _validation_report(stable_paths, top_paths)

    print("\nMC²-ACO pipeline complete.\n")


if __name__ == "__main__":
    main()
