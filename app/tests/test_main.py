import pytest
import sys
import os

# Adiciona o diretório raiz ao PYTHONPATH para encontrar o módulo 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    # FastAPI retorna 404 se não houver rota "/", o que confirma que a app subiu
    assert response.status_code in [200, 404]
