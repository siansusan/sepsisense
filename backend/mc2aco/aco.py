"""
aco.py

MC²-ACO engine: ant colony optimisation with Monte Carlo-initialised pheromones
and per-edge adaptive evaporation. Ants walk the transition graph from START
toward SEPSIS; path quality is measured as validation-set sensitivity.
"""

import random
import numpy as np
import networkx as nx
from tqdm import tqdm
from collections import defaultdict


N_ANTS = 50
N_ITERATIONS = 200
ALPHA = 1.0   # pheromone weight
BETA = 2.0    # heuristic weight
DEFAULT_TAU = 0.01
DEFAULT_RHO = 0.10

SENTINEL_START = "START"
SENTINEL_SEPSIS = "SEPSIS"


def _heuristic(G: nx.DiGraph) -> dict:
    """
    Compute normalised transition frequency η(i→j) for each edge.
    η = weight / sum_of_outgoing_weights from node i.
    """
    eta = {}
    for node in G.nodes():
        out_edges = list(G.out_edges(node, data="weight"))
        total = sum(w for _, _, w in out_edges) or 1.0
        for _, dst, w in out_edges:
            eta[(node, dst)] = w / total
    return eta


def _ant_walk(
    G: nx.DiGraph,
    pheromone: dict,
    eta: dict,
    alpha: float,
    beta: float,
) -> list:
    """
    One ant walks from START toward SEPSIS without revisiting nodes.
    Returns the path as a list of state strings.
    """
    current = SENTINEL_START
    path = [current]
    visited = {current}

    while current != SENTINEL_SEPSIS:
        neighbors = [
            dst for dst in G.successors(current) if dst not in visited
        ]
        if not neighbors:
            break

        scores = []
        for dst in neighbors:
            tau = pheromone.get((current, dst), DEFAULT_TAU)
            h = eta.get((current, dst), 1e-6)
            scores.append((tau ** alpha) * (h ** beta))

        total = sum(scores) or 1e-12
        probs = [s / total for s in scores]

        chosen = random.choices(neighbors, weights=probs, k=1)[0]
        path.append(chosen)
        visited.add(chosen)
        current = chosen

    return path


def _path_sensitivity(path: list, val_sequences: dict) -> float:
    """
    Fraction of true sepsis patients in the validation set whose state
    sequence contains this path as a subsequence.
    """
    sepsis_pids = [
        pid for pid, seq in val_sequences.items()
        if SENTINEL_SEPSIS in [s for s, _ in seq]
    ]
    if not sepsis_pids:
        return 0.0

    hits = 0
    for pid in sepsis_pids:
        states = [s for s, _ in val_sequences[pid]]
        # subsequence check
        idx = 0
        for state in states:
            if idx < len(path) and state == path[idx]:
                idx += 1
        if idx == len(path):
            hits += 1

    return hits / len(sepsis_pids)


def run_aco(
    G: nx.DiGraph,
    pheromone: dict,
    variance: dict,
    evaporation_rates: dict,
    val_sequences: dict,
    n_ants: int = N_ANTS,
    n_iterations: int = N_ITERATIONS,
    alpha: float = ALPHA,
    beta: float = BETA,
    seed: int = 42,
) -> list:
    """
    Execute the MC²-ACO algorithm.

    Parameters
    ----------
    G                 : transition graph
    pheromone         : initial pheromone dict {(src,dst): τ}
    variance          : MC variance dict {(src,dst): σ²}
    evaporation_rates : per-edge ρ {(src,dst): ρ}
    val_sequences     : validation patient sequences for fitness evaluation
    n_ants            : colony size per iteration
    n_iterations      : number of ACO iterations
    alpha, beta       : pheromone / heuristic exponents

    Returns
    -------
    list of (path_tuple, score) sorted descending by score
    """
    random.seed(seed)
    np.random.seed(seed)

    tau = dict(pheromone)  # mutable working copy
    eta = _heuristic(G)

    path_scores: dict = defaultdict(list)

    for iteration in tqdm(range(n_iterations), desc="ACO iterations"):
        iteration_paths = []

        for _ in range(n_ants):
            path = _ant_walk(G, tau, eta, alpha, beta)
            if len(path) >= 2:
                sensitivity = _path_sensitivity(path, val_sequences)
                iteration_paths.append((tuple(path), sensitivity))
                path_scores[tuple(path)].append(sensitivity)

        # Pheromone evaporation
        for edge in list(tau.keys()):
            rho = evaporation_rates.get(edge, DEFAULT_RHO)
            tau[edge] = (1.0 - rho) * tau[edge]
            tau[edge] = max(tau[edge], 1e-6)

        # Reinforce top paths this iteration
        if iteration_paths:
            iteration_paths.sort(key=lambda x: x[1], reverse=True)
            top_k = iteration_paths[: max(1, n_ants // 5)]
            for path, score in top_k:
                for i in range(len(path) - 1):
                    edge = (path[i], path[i + 1])
                    tau[edge] = tau.get(edge, DEFAULT_TAU) + score

    # Aggregate: mean sensitivity per unique path
    aggregated = []
    for path, scores in path_scores.items():
        mean_score = float(np.mean(scores))
        mean_tau = float(np.mean([tau.get((path[i], path[i+1]), DEFAULT_TAU)
                                   for i in range(len(path)-1)])) if len(path) > 1 else 0.0
        aggregated.append((path, mean_score, mean_tau))

    aggregated.sort(key=lambda x: x[1], reverse=True)
    print(f"[aco] Found {len(aggregated)} unique paths across {n_iterations} iterations")
    return aggregated, tau
