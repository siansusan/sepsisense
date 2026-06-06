"""
data_loader.py

Loads the secondary sepsis dataset and performs a 70/30 train/validation
split by Patient_ID to prevent data leakage across time series.
"""

import pandas as pd
import numpy as np


def load_and_split(
    csv_path: str = "mc2aco/secondary_sepsis_data.csv",
    train_frac: float = 0.70,
    seed: int = 42,
) -> tuple:
    """
    Load CSV and split patients 70/30 into train and validation sets.

    Returns (train_df, val_df) — both are full-row subsets keyed by Patient_ID.
    """
    df = pd.read_csv(csv_path)
    all_pids = df["Patient_ID"].unique()

    rng = np.random.default_rng(seed)
    rng.shuffle(all_pids)

    n_train = int(len(all_pids) * train_frac)
    train_pids = set(all_pids[:n_train])
    val_pids = set(all_pids[n_train:])

    train_df = df[df["Patient_ID"].isin(train_pids)].reset_index(drop=True)
    val_df = df[df["Patient_ID"].isin(val_pids)].reset_index(drop=True)

    print(
        f"[data_loader] Loaded {len(df)} rows | "
        f"Train: {len(train_pids)} patients ({len(train_df)} rows) | "
        f"Val: {len(val_pids)} patients ({len(val_df)} rows)"
    )
    return train_df, val_df
