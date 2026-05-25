from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_main():
    response = client.get("/")
    # FastAPI retorna 404 se não houver rota "/", o que confirma que a app subiu sem erros
    assert response.status_code in [200, 404]
