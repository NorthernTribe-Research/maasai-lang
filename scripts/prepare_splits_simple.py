#!/usr/bin/env python3
"""
Simple data preparation: create train/valid/test splits without pandas dependency.
"""

import json
import random
from pathlib import Path

def prepare_splits(input_file: str, output_dir: str, train_ratio: float = 0.85):
    """Split data into train/valid/test without pandas."""
    
    input_path = Path(input_file)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Reading {input_file}...")
    
    # Load all data
    pairs = []
    with open(input_path) as f:
        for line in f:
            pairs.append(json.loads(line))
    
    print(f"Loaded {len(pairs)} pairs")
    
    # Shuffle
    random.seed(42)
    random.shuffle(pairs)
    
    # Split
    train_size = int(len(pairs) * train_ratio)
    valid_size = int(len(pairs) * (1 - train_ratio) / 2)
    
    train_pairs = pairs[:train_size]
    valid_pairs = pairs[train_size : train_size + valid_size]
    test_pairs = pairs[train_size + valid_size:]
    
    # Write splits
    for split_name, split_data in [
        ("train", train_pairs),
        ("valid", valid_pairs),
        ("test", test_pairs),
    ]:
        split_file = output_path / f"{split_name}.jsonl"
        with open(split_file, "w") as f:
            for pair in split_data:
                f.write(json.dumps(pair, ensure_ascii=False) + "\n")
        print(f"  {split_name:6s}: {len(split_data):5,} pairs → {split_file}")
    
    print(f"\n✓ Data preparation complete")
    return len(train_pairs), len(valid_pairs), len(test_pairs)

if __name__ == "__main__":
    train, valid, test = prepare_splits(
        "data/raw/bible_comprehensive.jsonl",
        "data/final_v3",
        train_ratio=0.85
    )
