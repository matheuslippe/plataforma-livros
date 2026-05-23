import pytest
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_read_main():
    # Ajuste o endpoint conforme sua API real
    response = client.get("/")
    assert response.status_code in [200, 404] # Só para garantir que a app sobe
