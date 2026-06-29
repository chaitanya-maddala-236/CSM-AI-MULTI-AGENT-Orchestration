"""Repository pattern — thin wrappers over SQLAlchemy for reusable queries."""
from .customer_repository import CustomerRepository
from .recommendation_repository import RecommendationRepository

__all__ = ["CustomerRepository", "RecommendationRepository"]
