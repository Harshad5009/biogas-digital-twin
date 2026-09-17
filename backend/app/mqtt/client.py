"""
client.py — MQTT client for the Biogas Digital Twin backend.

Connects to the MQTT broker, subscribes to sensor topics,
and publishes alerts and commands.

Supports secure TLS connection to HiveMQ Cloud.
Falls back gracefully if the broker is unavailable.
"""

import asyncio
import json
import logging
import ssl
from typing import Optional, Callable, Any

from app import database

try:
    import paho.mqtt.client as mqtt

    PAHO_AVAILABLE = True

except ImportError:
    PAHO_AVAILABLE = False

from app.config import settings

from app.mqtt.topics import (
    TOPIC_SENSORS,
    TOPIC_STATUS,
    TOPIC_COMMANDS,
    TOPIC_SIMULATION,
    TOPIC_ALERTS,
)


logger = logging.getLogger("mqtt_client")


class MQTTClient:
    """
    Wrapper around paho-mqtt for the Biogas Digital Twin backend.

    Features:
    - Connect and disconnect
    - Subscribe to sensor and simulation topics
    - Receive ESP8266 sensor data
    - Publish alerts and commands
    - Publish system status
    - TLS-secured HiveMQ Cloud connection
    - Automatic MQTT network loop
    """

    def __init__(self):
        self._client: Optional[Any] = None
        self._connected: bool = False
        self._data_callback: Optional[Callable] = None
        self._loop = None

        if not PAHO_AVAILABLE:
            logger.warning(
                "paho-mqtt is not installed. MQTT functionality is disabled."
            )
            return

        # ----------------------------------------------------
        # Create MQTT client
        # ----------------------------------------------------
        #
        # VERSION1 supports the callback signatures used below.
        # The fallback supports older paho-mqtt versions.
        # ----------------------------------------------------
        try:
            self._client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
                client_id=settings.MQTT_CLIENT_ID,
            )

        except (AttributeError, TypeError):
            self._client = mqtt.Client(
                client_id=settings.MQTT_CLIENT_ID
            )

        # ----------------------------------------------------
        # Register MQTT callbacks
        # ----------------------------------------------------
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        # ----------------------------------------------------
        # MQTT authentication
        # ----------------------------------------------------
        if settings.MQTT_USERNAME:
            self._client.username_pw_set(
                username=settings.MQTT_USERNAME,
                password=settings.MQTT_PASSWORD,
            )

        # ----------------------------------------------------
        # TLS configuration for HiveMQ Cloud
        # HiveMQ Cloud TLS port: 8883
        # ----------------------------------------------------
        try:
            self._client.tls_set(
                cert_reqs=ssl.CERT_REQUIRED,
                tls_version=ssl.PROTOCOL_TLS_CLIENT,
            )

            logger.info("MQTT TLS security configured.")

        except Exception as error:
            logger.exception(
                "Failed to configure MQTT TLS: %s",
                error,
            )

    # ========================================================
    # Connection management
    # ========================================================

    def connect(self, data_callback=None, loop=None):
        """
        Connect to the MQTT broker and start the MQTT network loop.

        Args:
            data_callback:
                Function called when sensor JSON data is received.

            loop:
                Optional asyncio event loop.
        """

        if not PAHO_AVAILABLE or self._client is None:
            logger.warning(
                "Paho MQTT is not available. MQTT is disabled."
            )
            return

        self._data_callback = data_callback
        self._loop = loop

        try:
            logger.info(
                "Connecting to MQTT broker at %s:%s",
                settings.MQTT_HOST,
                settings.MQTT_PORT,
            )

            self._client.connect(
                host=settings.MQTT_HOST,
                port=int(settings.MQTT_PORT),
                keepalive=60,
            )

            # Start MQTT background network loop.
            # This also allows MQTT messages to be received.
            self._client.loop_start()

        except Exception as error:
            self._connected = False

            logger.exception(
                "MQTT connection failed: %s. Running without MQTT.",
                error,
            )

    def disconnect(self):
        """
        Stop the MQTT loop and disconnect from the broker.
        """

        if self._client is None:
            return

        try:
            self._client.loop_stop()
            self._client.disconnect()

        except Exception as error:
            logger.exception(
                "Error while disconnecting MQTT: %s",
                error,
            )

        finally:
            self._connected = False

    @property
    def is_connected(self) -> bool:
        """
        Return the current MQTT connection status.
        """

        return self._connected

    # ========================================================
    # MQTT callbacks
    # ========================================================

    def _on_connect(
        self,
        client,
        userdata,
        flags,
        rc,
        properties=None,
    ):
        """
        Called when the MQTT client connects to the broker.
        """

        if rc == 0:
            self._connected = True

            logger.info("MQTT connected successfully.")

            # ------------------------------------------------
            # Subscribe ONLY to ESP8266 sensor topic
            # (Do NOT subscribe to wildcard biogas/# to avoid echo loops)
            # ------------------------------------------------
            result_sensor, _ = client.subscribe(
                settings.MQTT_TOPIC_SENSORS
            )

            if result_sensor == mqtt.MQTT_ERR_SUCCESS:
                logger.info(
                    "Subscribed to sensor topic: %s",
                    settings.MQTT_TOPIC_SENSORS,
                )
            else:
                logger.error(
                    "Failed to subscribe to sensor topic: %s",
                    settings.MQTT_TOPIC_SENSORS,
                )

        else:
            self._connected = False

            logger.error(
                "MQTT connection refused. Return code: %s",
                rc,
            )

    def _on_disconnect(
        self,
        client,
        userdata,
        rc,
        properties=None,
    ):
        """
        Called when the MQTT client disconnects.
        """

        self._connected = False

        if rc == 0:
            logger.info(
                "MQTT disconnected normally."
            )

        else:
            logger.warning(
                "Unexpected MQTT disconnect. Return code: %s. "
                "The MQTT client may reconnect automatically.",
                rc,
            )

    def _on_message(self, client, userdata, msg):
        """
        Handle incoming MQTT messages.

        Expected sensor payload example:

        {
            "device_id": "digester01",
            "temperature": 27.9,
            "humidity": 71.0,
            "mq5_analog": 317,
            "mq5_status": "NORMAL",
            "mq2_status": "NORMAL",
            "system_status": "NORMAL"
        }
        """

        try:
            # ------------------------------------------------
            # Decode MQTT message
            # ------------------------------------------------
            payload_text = msg.payload.decode("utf-8")

            # Convert JSON string into Python dictionary
            payload = json.loads(payload_text)

            # ------------------------------------------------
            # IMPORTANT: Log every received MQTT message
            # ------------------------------------------------
            logger.info(
                "MQTT message received | Topic: %s | Payload: %s",
                msg.topic,
                payload,
            )

            # ------------------------------------------------
            # Topic & Payload Validation
            # ------------------------------------------------
            if msg.topic != settings.MQTT_TOPIC_SENSORS:
                logger.debug(
                    "Ignoring non-sensor MQTT message from topic %s",
                    msg.topic,
                )
                return

            # Ignore alert/command or non-measurement payloads that might have arrived
            has_sensor_fields = any(
                k in payload
                for k in ("temperature", "humidity", "mq5_analog", "mq5", "mq2", "mq2_status")
            )
            if not has_sensor_fields or ("command" in payload and "temperature" not in payload):
                logger.info(
                    "Ignoring non-sensor message on topic %s",
                    msg.topic,
                )
                return

            # Explicitly mark incoming hardware data source as LIVE
            if "source" not in payload or payload["source"] not in ["LIVE", "ESP8266"]:
                payload["source"] = "LIVE"

            logger.info("Received LIVE MQTT reading from %s", payload.get("device_id", settings.DIGESTER_ID))

            # ------------------------------------------------
            # Call the backend data-processing callback
            # ------------------------------------------------
            if self._data_callback:
                callback_result = self._data_callback(payload)

                # Support asynchronous callback functions
                if asyncio.iscoroutine(callback_result):

                    try:
                        running_loop = asyncio.get_running_loop()

                        running_loop.create_task(
                            callback_result
                        )

                    except RuntimeError:
                        asyncio.run(callback_result)

        except UnicodeDecodeError as error:
            logger.error(
                "Unable to decode MQTT payload on topic %s: %s",
                msg.topic,
                error,
            )

        except json.JSONDecodeError as error:
            logger.error(
                "Invalid JSON received on MQTT topic %s: %s",
                msg.topic,
                error,
            )

        except Exception as error:
            logger.exception(
                "Error processing MQTT message: %s",
                error,
            )

    # ========================================================
    # Publishing
    # ========================================================

    def publish_alert(self, level: str, message: str):
        """
        Publish an alert to the alert topic.

        Also sends a command to the ESP8266 so that the device
        can activate an LED or buzzer.
        """

        if not self._connected or self._client is None:
            logger.warning(
                "Cannot publish alert: MQTT is not connected."
            )
            return False

        try:
            # ------------------------------------------------
            # Alert message for dashboard/backend subscribers
            # ------------------------------------------------
            alert_payload = json.dumps(
                {
                    "command": "ALERT",
                    "level": level,
                    "message": message,
                }
            )

            alert_result = self._client.publish(
                TOPIC_ALERTS,
                alert_payload,
            )

            # ------------------------------------------------
            # Command message for ESP8266
            # ------------------------------------------------
            command_payload = json.dumps(
                {
                    "command": "ALERT",
                    "level": level,
                }
            )

            command_result = self._client.publish(
                TOPIC_COMMANDS,
                command_payload,
            )

            logger.info(
                "Alert published | Level: %s | Message: %s",
                level,
                message,
            )

            return (
                alert_result.rc == mqtt.MQTT_ERR_SUCCESS
                and command_result.rc == mqtt.MQTT_ERR_SUCCESS
            )

        except Exception as error:
            logger.exception(
                "Failed to publish alert: %s",
                error,
            )
            return False

    def publish_status(self, status: dict):
        """
        Publish the current system status.
        """

        if not self._connected or self._client is None:
            logger.warning(
                "Cannot publish status: MQTT is not connected."
            )
            return False

        try:
            status_payload = json.dumps(status)

            result = self._client.publish(
                TOPIC_STATUS,
                status_payload,
            )

            logger.info(
                "System status published: %s",
                status,
            )

            return result.rc == mqtt.MQTT_ERR_SUCCESS

        except Exception as error:
            logger.exception(
                "Failed to publish system status: %s",
                error,
            )
            return False


# ============================================================
# Global MQTT client instance
# ============================================================

mqtt_client = MQTTClient()