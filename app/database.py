from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Puxa o endereço do banco de dados lá do docker-compose.yml
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://admin:senha_segura@db:5432/livros_db"
)

# Cria o motor de conexão
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para criarmos nossas tabelas depois
Base = declarative_base()


# Função para abrir e fechar a conexão a cada pedido do aplicativo
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
