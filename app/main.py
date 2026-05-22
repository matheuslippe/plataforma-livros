from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import models, schemas
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma de Livros")


@app.get("/")
def raiz():
    return {"mensagem": "API online e conectada ao banco de dados!"}


# --- Nossas Rotas ---


@app.post("/usuarios/", response_model=schemas.UsuarioResposta)
def criar_usuario(usuario: schemas.UsuarioCriar, db: Session = Depends(get_db)):
    # Prepara o usuário para o banco de dados
    novo_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=usuario.senha,  # Depois vamos criptografar isso!
    )

    # Salva efetivamente no banco
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return novo_usuario
