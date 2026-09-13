import json
import logging
import ssl
import threading
from typing import Callable, Optional

import paho.mqtt.client as mqtt

from app.config import settings


logger = logging.getLogger(__name__)


class MQTTHandler:
    """
    Handles MQTT communication between the FastAPI backend
    and the ESP8266 biogas monitoring device.
    """

    def __init__(self):
        self.client = None
        self.connected = False
        self._message_callback: Optional[Callable] = None
        self._lock = threading.Lock()

        self.mqtt_host = settings.MQTT_HOST
        self.mqtt_port = int(settings.MQTT_PORT)
        self.mqtt_username = settings.MQTT_USERNAME
        self.mqtt_password = settings.MQTT_PASSWORD
        self.mqtt_topic = settings.MQTT_TOPIC_SENSORS
        self.mqtt_client_id = settings.MQTT_CLIENT_ID

    def set_message_callback(self, callback: Callable):
        """
        Register a function to process received MQTT messages.
        """
        self._message_callback = callback

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """
        Called when the backend connects to the MQTT broker.
        """

        if rc == 0:
            self.connected = True

            logger.info(
                "Connected to MQTT broker: %s:%s",
                self.mqtt_host,
                self.mqtt_port,
            )

            result, mid = client.subscribe(self.mqtt_topic)

            if result == mqtt.MQTT_ERR_SUCCESS:
                logger.info(
                    "Subscribed to MQTT topic: %s",
                    self.mqtt_topic,
                )
            else:
                logger.error(
                    "Failed to subscribe to topic: %s",
                    self.mqtt_topic,
                )

        else:
            self.connected = False
            logger.error(
                "MQTT connection failed. Return code: %s",
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
        Called when the backend disconnects from the MQTT broker.
        """

        self.connected = False

        if rc == 0:
            logger.info("Disconnected from MQTT broker normally.")
        else:
            logger.warning(
                "Unexpected MQTT disconnection. Return code: %s",
                rc,
            )

    def _on_message(self, client, userdata, message):
        """
        Called whenever a message is received from the subscribed topic.
        """

        try:
            payload = message.payload.decode("utf-8")

            logger.info(
                "MQTT message received from topic %s: %s",
                message.topic,
                payload,
            )

            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                logger.error("Received payload is not valid JSON.")
                return

            if self._message_callback is not None:
                self._message_callback(data)

        except Exception as error:
            logger.exception(
                "Error while processing MQTT message: %s",
                error,
            )

    def connect(self):
        """
        Connect the backend to HiveMQ Cloud.
        """

        with self._lock:
            if self.connected:
                logger.info("MQTT client is already connected.")
                return

            try:
                # Compatible with Paho MQTT 2.x and older versions
                try:
                    self.client = mqtt.Client(
                        callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
                        client_id=self.mqtt_client_id,
                    )
                except AttributeError:
                    self.client = mqtt.Client(
                        client_id=self.mqtt_client_id,
                    )

                # HiveMQ Cloud authentication
                self.client.username_pw_set(
                    username=self.mqtt_username,
                    password=self.mqtt_password,
                )

                # Enable TLS encryption for HiveMQ Cloud
                self.client.tls_set(
                    cert_reqs=ssl.CERT_REQUIRED,
                    tls_version=ssl.PROTOCOL_TLS_CLIENT,
                )

                # Register callbacks
                self.client.on_connect = self._on_connect
                self.client.on_disconnect = self._on_disconnect
                self.client.on_message = self._on_message

                logger.info(
                    "Connecting to HiveMQ Cloud at %s:%s",
                    self.mqtt_host,
                    self.mqtt_port,
                )

                self.client.connect(
                    host=self.mqtt_host,
                    port=self.mqtt_port,
                    keepalive=60,
                )

                # Start MQTT network loop in background
                self.client.loop_start()

            except Exception as error:
                self.connected = False
                logger.exception(
                    "Unable to connect to MQTT broker: %s",
                    error,
                )
                raise

    def disconnect(self):
        """
        Disconnect the backend from the MQTT broker.
        """

        with self._lock:
            if self.client is not None:
                try:
                    self.client.loop_stop()
                    self.client.disconnect()
                    self.connected = False
                    logger.info("Disconnected from MQTT broker.")
                except Exception as error:
                    logger.exception(
                        "Error while disconnecting MQTT: %s",
                        error,
                    )

    def publish(self, topic: str, payload: dict, retain: bool = False):
        """
        Publish a JSON message to an MQTT topic.
        """

        if self.client is None or not self.connected:
            logger.warning("MQTT client is not connected.")
            return False

        try:
            message = json.dumps(payload)

            result = self.client.publish(
                topic=topic,
                payload=message,
                qos=0,
                retain=retain,
            )

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(
                    "MQTT message published to topic: %s",
                    topic,
                )
                return True

            logger.error(
                "MQTT publish failed. Return code: %s",
                result.rc,
            )
            return False

        except Exception as error:
            logger.exception(
                "Error while publishing MQTT message: %s",
                error,
            )
            return False