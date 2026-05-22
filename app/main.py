from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from . import models, schemas, security
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma de Livros")

# --- O Cadeado ---
# Isso diz ao FastAPI onde os usuários pegam o token
cadeado = OAuth2PasswordBearer(tokenUrl="login")


# Função que fiscaliza a porta. Ela pega o token, verifica se é verdadeiro e descobre de quem é.
def obter_usuario_logado(token: str = Depends(cadeado)):
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        usuario_id: str = payload.get("sub")
        if usuario_id is None:
            raise HTTPException(status_code=401, detail="Crachá inválido")
        return int(usuario_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Crachá inválido ou expirado")


@app.get("/")
def raiz():
    return {"mensagem": "API blindada e online!"}


# --- Rota de Login ---


@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == form_data.username)
        .first()
    )
    if not usuario or not security.verificar_senha(
        form_data.password, usuario.senha_hash
    ):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos")

    token = security.criar_token_acesso(dados={"sub": str(usuario.id)})
    return {"access_token": token, "token_type": "bearer"}


# --- Rotas de Usuários ---


@app.post("/usuarios/", response_model=schemas.UsuarioResposta)
def criar_usuario(usuario: schemas.UsuarioCriar, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    senha_criptografada = security.obter_hash_senha(usuario.senha)
    novo_usuario = models.Usuario(
        nome=usuario.nome, email=usuario.email, senha_hash=senha_criptografada
    )

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


# --- Rotas de Livros ---


# Veja o Depends(obter_usuario_logado) aqui. É o cadeado na porta!
@app.post("/livros/", response_model=schemas.LivroResposta)
def criar_livro(
    livro: schemas.LivroCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(obter_usuario_logado),
):
    novo_livro = models.Livro(
        titulo=livro.titulo,
        sinopse=livro.sinopse,
        autor_id=usuario_id,  # Agora a API confia no ID do Token, não no que o usuário digita
        url_capa=livro.url_capa,
    )
    db.add(novo_livro)
    db.commit()
    db.refresh(novo_livro)
    return novo_livro


@app.get("/livros/", response_model=list[schemas.LivroResposta])
def listar_livros(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(models.Livro).offset(skip).limit(limit).all()


# --- Rotas de Capítulos ---


# Cadeado aqui também!
@app.post("/capitulos/", response_model=schemas.CapituloResposta)
def criar_capitulo(
    capitulo: schemas.CapituloCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(obter_usuario_logado),
):
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
    return (
        db.query(models.Capitulo)
        .filter(models.Capitulo.livro_id == livro_id)
        .order_by(models.Capitulo.ordem_leitura)
        .all()
    )
