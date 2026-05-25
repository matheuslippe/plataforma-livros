import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

usuario = os.getenv("POSTGRES_USER", "admin").strip()
senha_crua = os.getenv("POSTGRES_PASSWORD", "").strip()
banco = os.getenv("POSTGRES_DB", "livros_db").strip()

# NOVA VARIÁVEL: Pega o host dinamicamente (usa "db" como padrão para manter seu Docker funcionando)
db_host = os.getenv("POSTGRES_HOST", "db").strip()

# Isso transforma caracteres especiais como '@' em códigos seguros (ex: '%40')
senha_segura = quote_plus(senha_crua)

# A URL agora usa a variável {db_host} em vez do nome fixo
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{usuario}:{senha_segura}@{db_host}:5432/{banco}"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
