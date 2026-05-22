from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import models, schemas
from .database import engine, get_db

# Isso cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

# Isso aqui é o que faltava! É a criação da variável 'app'
app = FastAPI(title="Plataforma de Livros")


@app.get("/")
def raiz():
    return {"mensagem": "API online e conectada ao banco de dados!"}


# --- Nossas Rotas de Usuário ---


@app.post("/usuarios/", response_model=schemas.UsuarioResposta)
def criar_usuario(usuario: schemas.UsuarioCriar, db: Session = Depends(get_db)):
    novo_usuario = models.Usuario(
        nome=usuario.nome, email=usuario.email, senha_hash=usuario.senha
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


# --- Nossas Rotas de Livros ---


@app.post("/livros/", response_model=schemas.LivroResposta)
def criar_livro(livro: schemas.LivroCriar, db: Session = Depends(get_db)):
    novo_livro = models.Livro(
        titulo=livro.titulo,
        sinopse=livro.sinopse,
        autor_id=livro.autor_id,
        url_capa=livro.url_capa,
    )
    db.add(novo_livro)
    db.commit()
    db.refresh(novo_livro)
    return novo_livro


@app.get("/livros/", response_model=list[schemas.LivroResposta])
def listar_livros(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    livros = db.query(models.Livro).offset(skip).limit(limit).all()
    return livros


# --- Rotas de Capítulos ---


@app.post("/capitulos/", response_model=schemas.CapituloResposta)
def criar_capitulo(capitulo: schemas.CapituloCriar, db: Session = Depends(get_db)):
    novo_capitulo = models.Capitulo(
        livro_id=capitulo.livro_id,
        titulo_do_capitulo=capitulo.titulo_do_capitulo,
        conteudo_texto=capitulo.conteudo_texto,
        ordem_leitura=capitulo.ordem_leitura,
    )
    db.add(novo_capitulo)
    db.commit()
    db.refresh(novo_capitulo)
    return novo_capitulo


@app.get("/livros/{livro_id}/capitulos", response_model=list[schemas.CapituloResposta])
def listar_capitulos_do_livro(livro_id: int, db: Session = Depends(get_db)):
    # Busca os capítulos do livro selecionado e já organiza pela ordem de leitura
    capitulos = (
        db.query(models.Capitulo)
        .filter(models.Capitulo.livro_id == livro_id)
        .order_by(models.Capitulo.ordem_leitura)
        .all()
    )
    return capitulos
