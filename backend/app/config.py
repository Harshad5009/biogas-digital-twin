"""
config.py — Central configuration using environment variables.
All settings loaded from .env file via python-dotenv.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    """Application settings loaded from environment variables."""

    # Application
    APP_ENV: str = os.getenv("APP_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/biogas.db")

    # MQTT
    MQTT_HOST: str = os.getenv("MQTT_HOST", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "")
    MQTT_CLIENT_ID: str = os.getenv("MQTT_CLIENT_ID", "biogas-backend")

    # MQTT Topics
    MQTT_TOPIC_SENSORS: str = os.getenv("MQTT_TOPIC_SENSORS", "biogas/digester01/sensors")
    MQTT_TOPIC_STATUS: str = os.getenv("MQTT_TOPIC_STATUS", "biogas/digester01/status")
    MQTT_TOPIC_COMMANDS: str = os.getenv("MQTT_TOPIC_COMMANDS", "biogas/digester01/commands")
    MQTT_TOPIC_SIMULATION: str = os.getenv("MQTT_TOPIC_SIMULATION", "biogas/digester01/simulation")
    MQTT_TOPIC_ALERTS: str = os.getenv("MQTT_TOPIC_ALERTS", "biogas/digester01/alerts")

    # Simulation
    SIMULATION_ENABLED: bool = os.getenv("SIMULATION_ENABLED", "true").lower() == "true"
    SIMULATION_INTERVAL_SECONDS: int = int(os.getenv("SIMULATION_INTERVAL_SECONDS", "5"))

    # Digester ID
    DIGESTER_ID: str = os.getenv("DIGESTER_ID", "digester01")

    # CORS
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")


# Singleton settings instance
settings = Settings()
