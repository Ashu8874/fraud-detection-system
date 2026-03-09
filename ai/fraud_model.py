import argparse
import json
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def load_data(csv_path: Path) -> pd.DataFrame:
  df = pd.read_csv(csv_path)
  required = {
    "amount",
    "currency",
    "merchant",
    "location",
    "payment_method",
    "device_id",
    "label"
  }
  missing = required.difference(df.columns)
  if missing:
    raise ValueError(f"Missing required columns: {sorted(missing)}")
  return df


def build_pipeline() -> Pipeline:
  numeric_features = ["amount"]
  categorical_features = [
    "currency",
    "merchant",
    "location",
    "payment_method",
    "device_id"
  ]

  preprocessor = ColumnTransformer(
    transformers=[
      ("num", "passthrough", numeric_features),
      ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
    ]
  )

  model = RandomForestClassifier(n_estimators=200, random_state=42)

  return Pipeline(steps=[("prep", preprocessor), ("model", model)])


def train_and_evaluate(df: pd.DataFrame) -> dict:
  x = df[["amount", "currency", "merchant", "location", "payment_method", "device_id"]]
  y = df["label"]

  x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size=0.25, random_state=42, stratify=y
  )

  pipeline = build_pipeline()
  pipeline.fit(x_train, y_train)

  y_pred = pipeline.predict(x_test)
  report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

  return {
    "rows": int(len(df)),
    "fraud_ratio": float(df["label"].mean()),
    "metrics": report,
  }


def main() -> None:
  parser = argparse.ArgumentParser(description="Train a baseline fraud model")
  parser.add_argument(
    "--data",
    default="dataset/transactions.csv",
    help="Path to CSV dataset",
  )
  args = parser.parse_args()

  csv_path = Path(args.data)
  if not csv_path.exists():
    raise FileNotFoundError(f"Dataset not found: {csv_path}")

  df = load_data(csv_path)
  summary = train_and_evaluate(df)
  print(json.dumps(summary, indent=2))


if __name__ == "__main__":
  main()
