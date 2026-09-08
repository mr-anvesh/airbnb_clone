from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/airbnb.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["*"]
    SECRET_KEY: str = "super-secret-key-change-in-production-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Rate limiting – token bucket (capacity, requests-per-minute)
    # Set RATE_LIMIT_ENABLED=false in .env to disable for local dev
    RATE_LIMIT_ENABLED: bool = True
    # Global per-IP limit (all endpoints)
    RL_GLOBAL_CAPACITY: int = 300
    RL_GLOBAL_RPM: float = 300          # 300 req/min burst, sustained
    # Authenticated user catch-all
    RL_USER_CAPACITY: int = 200
    RL_USER_RPM: float = 200
    # Booking writes (POST /bookings) – anti-spam
    RL_BOOKING_CAPACITY: int = 10
    RL_BOOKING_RPM: float = 10          # 10 bookings/min max
    # Listing writes (POST/PUT/DELETE /listings)
    RL_LISTING_CAPACITY: int = 20
    RL_LISTING_RPM: float = 20
    # Auth endpoints – brute-force protection
    RL_AUTH_CAPACITY: int = 10
    RL_AUTH_RPM: float = 5              # 5 attempts/min sustained

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
