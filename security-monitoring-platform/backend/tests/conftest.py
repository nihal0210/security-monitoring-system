import pytest
from app.core.database import init_db
from app.main import seed_initial_users

@pytest.fixture(autouse=True, scope="session")
def initialize_database():
    init_db()
    seed_initial_users()
