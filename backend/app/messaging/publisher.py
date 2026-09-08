import logging

import pika

from app.config import settings
from app.messaging.events import DomainEvent

logger = logging.getLogger(__name__)


class EventPublisher:
    EXCHANGE = "domain.events"

    def __init__(self):
        self._connection = None
        self._channel = None

    def _connect(self):
        try:
            self._connection = pika.BlockingConnection(
                pika.URLParameters(settings.RABBITMQ_URL)
            )
            self._channel = self._connection.channel()
            self._channel.exchange_declare(
                exchange=self.EXCHANGE,
                exchange_type="topic",
                durable=True,
            )
        except Exception as e:
            logger.warning("RabbitMQ connection failed: %s", e)
            self._channel = None

    @property
    def channel(self):
        if self._channel is None or (
            self._connection and self._connection.is_closed
        ):
            self._connect()
        return self._channel

    def publish(self, event: DomainEvent) -> None:
        try:
            if not self.channel:
                logger.warning(
                    "RabbitMQ unavailable, skipping event: %s",
                    event.event_type,
                )
                return
            routing_key = event.event_type.value
            body = event.model_dump_json()
            self.channel.basic_publish(
                exchange=self.EXCHANGE,
                routing_key=routing_key,
                body=body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    content_type="application/json",
                ),
            )
            logger.info(
                "Published event: %s (%s)",
                event.event_type,
                event.event_id,
            )
        except Exception as e:
            logger.error("Failed to publish event: %s", e)

    def close(self):
        if self._connection and not self._connection.is_closed:
            self._connection.close()


event_publisher = EventPublisher()
