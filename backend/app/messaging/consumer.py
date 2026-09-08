import json
import logging

import pika

from app.config import settings

logger = logging.getLogger(__name__)


class EventConsumer:
    EXCHANGE = "domain.events"

    def __init__(self, queue_name: str, routing_keys: list[str]):
        self.queue_name = queue_name
        self.routing_keys = routing_keys
        self._connection = None
        self._channel = None

    def connect(self):
        self._connection = pika.BlockingConnection(
            pika.URLParameters(settings.RABBITMQ_URL)
        )
        self._channel = self._connection.channel()
        self._channel.exchange_declare(
            exchange=self.EXCHANGE,
            exchange_type="topic",
            durable=True,
        )
        self._channel.queue_declare(
            queue=self.queue_name,
            durable=True,
            arguments={
                "x-dead-letter-exchange": f"{self.EXCHANGE}.dlx",
                "x-dead-letter-routing-key": f"{self.queue_name}.dead",
            },
        )
        self._channel.exchange_declare(
            exchange=f"{self.EXCHANGE}.dlx",
            exchange_type="direct",
            durable=True,
        )
        self._channel.queue_declare(
            queue=f"{self.queue_name}.dead", durable=True
        )
        self._channel.queue_bind(
            queue=f"{self.queue_name}.dead",
            exchange=f"{self.EXCHANGE}.dlx",
            routing_key=f"{self.queue_name}.dead",
        )
        for key in self.routing_keys:
            self._channel.queue_bind(
                queue=self.queue_name,
                exchange=self.EXCHANGE,
                routing_key=key,
            )

    def consume(self, callback):
        self._channel.basic_qos(prefetch_count=1)
        self._channel.basic_consume(
            queue=self.queue_name,
            on_message_callback=self._wrap_callback(callback),
        )
        logger.info(
            "Consumer started on queue: %s", self.queue_name
        )
        self._channel.start_consuming()

    def _wrap_callback(self, callback):
        def wrapper(ch, method, properties, body):
            try:
                event = json.loads(body)
                callback(event)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                logger.error("Error processing message: %s", e)
                ch.basic_nack(
                    delivery_tag=method.delivery_tag, requeue=False
                )

        return wrapper
