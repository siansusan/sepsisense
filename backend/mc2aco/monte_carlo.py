"""
monte_carlo.py

Bootstrap-based Monte Carlo estimation of transition probabilities.
Computes per-edge mean and variance across B bootstrap samples drawn
from training patients, then initialises pheromone values.
"""

import numpy as np
from collections import defaultdict
from tqdm import tqdm


def _transition_probs_from_sequences(sequences: dict) -> dict:
    """
    Compute empirical transition probability dict {(src,dst): prob}
    from a collection of patient sequences.
    """
    counts: dict = defaultdict(int)
    out_totals: dict = defaultdict(int)

    for seq in sequences.values():
        states = [s for s, _ in seq]
        for i in range(len(states) - 1):
            src, dst = states[i], states[i + 1]
            counts[(src, dst)] += 1
            out_totals[src] += 1

    probs = {}
    for (src, dst), cnt in counts.items():
        probs[(src, dst)] = cnt / out_totals[src]
    return probs


def bootstrap_monte_carlo(
    sequences: dict,
    B: int = 10_000,
    seed: int = 42,
) -> tuple:
    """
    Draw B bootstrap samples of patients and compute per-edge transition
    probability distributions.

    Returns
    -------
    pheromone : dict  {(src,dst): τ}  initialised as 0.01 + 0.99×μ
    variance  : dict  {(src,dst): σ²}
    """
    np.random.seed(seed)
    pids = list(sequences.keys())
    n = len(pids)

    # Accumulate per-edge probabilities across bootstraps
    edge_samples: dict = defaultdict(list)

    for _ in tqdm(range(B), desc="Monte Carlo bootstrapping"):
        sample_pids = np.random.choice(pids, size=n, replace=True)
        sample_seqs = {i: sequences[p] for i, p in enumerate(sample_pids)}
        probs = _transition_probs_from_sequences(sample_seqs)
        for edge, p in probs.items():
            edge_samples[edge].append(p)

    pheromone = {}
    variance = {}

    for edge, samples in edge_samples.items():
        arr = np.array(samples)
        mu = arr.mean()
        sigma2 = arr.var()
        pheromone[edge] = 0.01 + (1.0 - 0.01) * mu
        variance[edge] = sigma2

    print(
        f"[monte_carlo] Estimated {len(pheromone)} edges | "
        f"tau range [{min(pheromone.values()):.4f}, {max(pheromone.values()):.4f}]"
    )
    return pheromone, variance
