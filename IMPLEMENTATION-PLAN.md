# Airbnb Clone — Implementation Plan

## Architecture

The application is a modular FastAPI backend and Next.js frontend. PostgreSQL is the authoritative relational datastore; Redis provides cache and rate-limiting support, and RabbitMQ handles asynchronous domain events. Nginx balances requests between stateless API replicas in Docker deployments.

```text
Next.js → Nginx → FastAPI replicas → PostgreSQL
                              ├── Redis
                              └── RabbitMQ → notification worker
```

The backend preserves router → service → repository → SQLAlchemy model boundaries. Booking availability is verified and written in the same PostgreSQL transaction; frontend availability results and Redis data are never authoritative for booking creation.

## PostgreSQL connectivity

SQLAlchemy connects through the `psycopg` driver using a `postgresql+psycopg://` URL. Every FastAPI and worker process uses a bounded pool configured as follows:

```python
create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=0,
    pool_timeout=10,
    pool_recycle=1800,
    pool_pre_ping=True,
)
```

The Docker deployment has three API replicas and one worker, so PostgreSQL must allow up to 40 application connections. Connection reuse is bounded per process; it does not make business operations transactional across PostgreSQL and RabbitMQ.

## Local development

Set `DATABASE_URL` to a PostgreSQL psycopg URL. `docker compose up` starts PostgreSQL 16, Redis, RabbitMQ, the APIs, worker, and frontend. The PostgreSQL data directory is persisted by the `postgres_data` Docker volume.

Use `python -m app.database.seed` after the database is available to create the demo data. Tests read `TEST_DATABASE_URL`, defaulting to `postgresql+psycopg://airbnb:airbnb@localhost:5432/airbnb_test`.

## Key invariants

- PostgreSQL is the source of truth for listings, bookings, reviews, wishlists, and notifications.
- Redis failures fail open for cache and rate-limiting behavior; they do not alter database correctness.
- A confirmed booking is inserted only after its overlap check succeeds in the same database transaction.
- RabbitMQ events are published after the database transaction commits. A production-grade outbox is the next step if cross-system delivery guarantees are required.
