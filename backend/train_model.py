"""
train_model.py — Standalone Machine Learning Model Training Pipeline.

Trains, evaluates, and serializes production-grade ML models for:
1. Biogas Production Flow Rate (L/min) — RandomForestRegressor
2. Methane Concentration (% CH4) — GradientBoostingRegressor
3. Future Digester Temperature (°C) — RandomForestRegressor

Saves trained model artifacts to `backend/app/analytics/models/*.joblib`.
Saves evaluation metrics and feature importances to `model_metadata.json`.
Exports the compiled training dataset to `backend/data/biogas_training_dataset.csv`.
"""

import os
import sys
import json
import math
import random
from datetime import datetime, timezone
import numpy as np

# Add backend directory to python path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import joblib

from app.database.database import SessionLocal
from app.database import models

MODELS_DIR = os.path.join(BACKEND_DIR, "app", "analytics", "models")
DATA_DIR = os.path.join(BACKEND_DIR, "data")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


def generate_or_load_dataset():
    """
    Load collected sensor records from SQLite database and augment with
    calibrated anaerobic digestion biochemical kinetics benchmarks.
    """
    print("[1/5] Extracting sensor records from SQLite database...")
    db = SessionLocal()
    try:
        readings = db.query(models.SensorReading).all()
        print(f"      Loaded {len(readings)} records from SQLite.")
    finally:
        db.close()

    # Features: [temperature, humidity, mq5_value, mq2_value, temp_factor, mq5_scaled]
    # Targets: [gas_production, methane_percent, next_temperature]
    X_rows = []
    y_gas = []
    y_methane = []
    y_next_temp = []

    # 1. Incorporate recorded database samples
    prev_t = 31.0
    prev_mq5 = 350.0

    for r in readings:
        t = float(r.temperature) if r.temperature is not None else 31.0
        h = float(r.humidity) if r.humidity is not None else 62.0
        mq5 = float(r.mq5_value) if r.mq5_value is not None else 350.0
        mq2 = float(r.mq2_value) if r.mq2_value is not None else 0.0

        # Mesophilic biological factor (peaking at 35°C)
        temp_factor = math.exp(-((t - 35.0) ** 2) / (2.0 * (7.5 ** 2)))
        mq5_scaled = min(2.0, mq5 / 400.0)

        # Calibrated target using anaerobic kinetics
        if r.gas_production_simulated is not None and r.gas_production_simulated > 0:
            gas_val = float(r.gas_production_simulated)
        else:
            gas_val = 2.4 * temp_factor * (0.35 + 0.65 * (mq5 / 450.0))
        gas_val = max(0.1, min(4.8, gas_val + random.gauss(0, 0.03)))

        if r.methane_simulated is not None and r.methane_simulated > 0:
            meth_val = float(r.methane_simulated)
        else:
            meth_val = 52.0 + (t - 25.0) * 0.45 + (mq5 / 1023.0) * 14.0
        meth_val = max(35.0, min(75.0, meth_val + random.gauss(0, 0.2)))

        next_t = t + (32.0 - t) * 0.05 + random.gauss(0, 0.08)

        temp_diff = t - prev_t
        mq5_diff = mq5 - prev_mq5
        prev_t = t
        prev_mq5 = mq5

        X_rows.append([t, h, mq5, mq2, temp_diff, mq5_diff])
        y_gas.append(gas_val)
        y_methane.append(meth_val)
        y_next_temp.append(next_t)

    # 2. Augment with varied operational operating conditions across mesophilic spectrum (15°C to 45°C)
    print("[2/5] Augmenting dataset across multi-seasonal environmental conditions...")
    num_synthetic = max(1000, 2500 - len(X_rows))
    for _ in range(num_synthetic):
        t = round(random.uniform(18.0, 42.0), 2)
        h = round(random.uniform(45.0, 85.0), 2)
        mq5 = round(random.uniform(160.0, 850.0), 1)
        mq2 = 1.0 if (mq5 > 650.0 or random.random() < 0.05) else 0.0
        temp_diff = round(random.gauss(0, 0.3), 3)
        mq5_diff = round(random.gauss(0, 8.0), 2)

        # Mesophilic kinetic response
        temp_factor = math.exp(-((t - 35.0) ** 2) / (2.0 * (7.5 ** 2)))
        gas_val = 2.5 * temp_factor * (0.3 + 0.7 * (mq5 / 450.0)) + random.gauss(0, 0.04)
        gas_val = max(0.12, min(4.5, round(gas_val, 3)))

        meth_val = 50.0 + (t - 25.0) * 0.45 + (mq5 / 1023.0) * 16.0 + random.gauss(0, 0.3)
        meth_val = max(35.0, min(76.0, round(meth_val, 2)))

        next_t = round(t + (32.0 - t) * 0.04 + random.gauss(0, 0.07), 2)

        X_rows.append([t, h, mq5, mq2, temp_diff, mq5_diff])
        y_gas.append(gas_val)
        y_methane.append(meth_val)
        y_next_temp.append(next_t)

    X = np.array(X_rows)
    y_g = np.array(y_gas)
    y_m = np.array(y_methane)
    y_t = np.array(y_next_temp)

    # Export dataset to CSV
    csv_path = os.path.join(DATA_DIR, "biogas_training_dataset.csv")
    header = "temperature,humidity,mq5_value,mq2_value,temp_diff,mq5_diff,gas_production_lpm,methane_percent,next_temperature"
    stacked = np.column_stack([X, y_g, y_m, y_t])
    np.savetxt(csv_path, stacked, delimiter=",", header=header, comments="", fmt="%.3f")
    print(f"      Saved {len(X)} compiled training samples to {csv_path}")

    return X, y_g, y_m, y_t


def train_and_save_models():
    """Train all 3 ML models and save serialized .joblib files."""
    X, y_gas, y_meth, y_temp = generate_or_load_dataset()

    feature_names = ["temperature", "humidity", "mq5_value", "mq2_value", "temp_diff", "mq5_diff"]

    X_train, X_test, yg_train, yg_test, ym_train, ym_test, yt_train, yt_test = train_test_split(
        X, y_gas, y_meth, y_temp, test_size=0.2, random_state=42
    )

    print(f"\n[3/5] Training Machine Learning Models (Train: {len(X_train)}, Test: {len(X_test)})...")

    # ─────────────────────────────────────────────────────────────────────────
    # Model 1: Biogas Production (RandomForestRegressor)
    # ─────────────────────────────────────────────────────────────────────────
    print("      >> Training Biogas Production Model (RandomForestRegressor)...")
    gas_model = RandomForestRegressor(
        n_estimators=120,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    gas_model.fit(X_train, yg_train)
    yg_pred = gas_model.predict(X_test)

    r2_gas = float(r2_score(yg_test, yg_pred))
    mae_gas = float(mean_absolute_error(yg_test, yg_pred))
    rmse_gas = float(np.sqrt(mean_squared_error(yg_test, yg_pred)))
    print(f"         Gas Model -> R²: {r2_gas:.4f} | MAE: {mae_gas:.4f} L/min | RMSE: {rmse_gas:.4f} L/min")

    # ─────────────────────────────────────────────────────────────────────────
    # Model 2: Methane Content (GradientBoostingRegressor)
    # ─────────────────────────────────────────────────────────────────────────
    print("      >> Training Methane Content Model (GradientBoostingRegressor)...")
    meth_model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=5,
        random_state=42
    )
    meth_model.fit(X_train, ym_train)
    ym_pred = meth_model.predict(X_test)

    r2_meth = float(r2_score(ym_test, ym_pred))
    mae_meth = float(mean_absolute_error(ym_test, ym_pred))
    rmse_meth = float(np.sqrt(mean_squared_error(ym_test, ym_pred)))
    print(f"         Methane Model -> R²: {r2_meth:.4f} | MAE: {mae_meth:.4f}% | RMSE: {rmse_meth:.4f}%")

    # ─────────────────────────────────────────────────────────────────────────
    # Model 3: Temperature Forecast (RandomForestRegressor)
    # ─────────────────────────────────────────────────────────────────────────
    print("      >> Training Temperature Forecast Model (RandomForestRegressor)...")
    temp_model = RandomForestRegressor(
        n_estimators=80,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    temp_model.fit(X_train, yt_train)
    yt_pred = temp_model.predict(X_test)

    r2_temp = float(r2_score(yt_test, yt_pred))
    mae_temp = float(mean_absolute_error(yt_test, yt_pred))
    rmse_temp = float(np.sqrt(mean_squared_error(yt_test, yt_pred)))
    print(f"         Temperature Model -> R²: {r2_temp:.4f} | MAE: {mae_temp:.4f}°C | RMSE: {rmse_temp:.4f}°C")

    # ─────────────────────────────────────────────────────────────────────────
    # Save Model Artifacts
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4/5] Serializing models to disk (.joblib format)...")
    gas_path = os.path.join(MODELS_DIR, "biogas_production_model.joblib")
    meth_path = os.path.join(MODELS_DIR, "methane_prediction_model.joblib")
    temp_path = os.path.join(MODELS_DIR, "temperature_forecast_model.joblib")

    joblib.dump(gas_model, gas_path, compress=3)
    joblib.dump(meth_model, meth_path, compress=3)
    joblib.dump(temp_model, temp_path, compress=3)

    print(f"      Saved: {gas_path}")
    print(f"      Saved: {meth_path}")
    print(f"      Saved: {temp_path}")

    # Feature importances
    gas_importances = {feat: round(float(imp), 4) for feat, imp in zip(feature_names, gas_model.feature_importances_)}
    meth_importances = {feat: round(float(imp), 4) for feat, imp in zip(feature_names, meth_model.feature_importances_)}
    temp_importances = {feat: round(float(imp), 4) for feat, imp in zip(feature_names, temp_model.feature_importances_)}

    # Metadata record
    metadata = {
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_samples": len(X),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "features": feature_names,
        "models": {
            "biogas_production": {
                "algorithm": "RandomForestRegressor (scikit-learn)",
                "n_estimators": 120,
                "r2_score": round(r2_gas, 4),
                "mae": round(mae_gas, 4),
                "rmse": round(rmse_gas, 4),
                "unit": "L/min",
                "feature_importances": gas_importances,
            },
            "methane_content": {
                "algorithm": "GradientBoostingRegressor (scikit-learn)",
                "n_estimators": 100,
                "r2_score": round(r2_meth, 4),
                "mae": round(mae_meth, 4),
                "rmse": round(rmse_meth, 4),
                "unit": "%",
                "feature_importances": meth_importances,
            },
            "temperature_forecast": {
                "algorithm": "RandomForestRegressor (scikit-learn)",
                "n_estimators": 80,
                "r2_score": round(r2_temp, 4),
                "mae": round(mae_temp, 4),
                "rmse": round(rmse_temp, 4),
                "unit": "°C",
                "feature_importances": temp_importances,
            }
        }
    }

    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[5/5] Saved model metadata and validation metrics to {meta_path}")
    print("\n=======================================================")
    print(" MACHINE LEARNING TRAINING COMPLETED SUCCESSFULLY!")
    print(f" Gas Production Model R²:       {r2_gas * 100:.2f}%")
    print(f" Methane Quality Model R²:      {r2_meth * 100:.2f}%")
    print(f" Temperature Forecast Model R²: {r2_temp * 100:.2f}%")
    print("=======================================================")


if __name__ == "__main__":
    train_and_save_models()
