from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    email = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())


class Livro(Base):
    __tablename__ = "livros"
    id = Column(Integer, primary_key=True, index=True)
    autor_id = Column(Integer, ForeignKey("usuarios.id"))
    titulo = Column(String, index=True)
    sinopse = Column(Text)
    url_capa = Column(String, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())


class Capitulo(Base):
    __tablename__ = "capitulos"
    id = Column(Integer, primary_key=True, index=True)
    livro_id = Column(Integer, ForeignKey("livros.id"))
    titulo_do_capitulo = Column(String)
    conteudo_texto = Column(Text)
    ordem_leitura = Column(Integer)
    status = Column(String, default="rascunho")
