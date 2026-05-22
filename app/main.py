from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from . import models, schemas, security
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import random
import os
import shutil
import time
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
import uuid

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma de Livros")

# Cria uma pasta "invisível" para o auto-reload não reiniciar a API
os.makedirs(".capas", exist_ok=True)

# Avisa que tudo que está na URL /static vai puxar dessa pasta .capas
app.mount("/static", StaticFiles(directory=".capas"), name="static")

# --- Configuração de CORS (Liberando o Frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Na vida real colocamos o link do site, aqui liberamos tudo para teste local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"access_token": token, "token_type": "bearer", "usuario_id": usuario.id}


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


# --- NOVAS ROTAS: Editar e Excluir Livros ---


@app.put("/livros/{livro_id}", response_model=schemas.LivroResposta)
def atualizar_livro(
    livro_id: int,
    livro_atualizado: schemas.LivroCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(obter_usuario_logado),
):
    # Procura o livro e garante que ele pertence a quem está tentando editar
    livro = (
        db.query(models.Livro)
        .filter(models.Livro.id == livro_id, models.Livro.autor_id == usuario_id)
        .first()
    )
    if not livro:
        raise HTTPException(
            status_code=404, detail="Livro não encontrado ou não pertence a você"
        )

    livro.titulo = livro_atualizado.titulo
    livro.sinopse = livro_atualizado.sinopse
    if livro_atualizado.url_capa:
        livro.url_capa = livro_atualizado.url_capa

    db.commit()
    db.refresh(livro)
    return livro


@app.delete("/livros/{livro_id}")
def deletar_livro(
    livro_id: int,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(obter_usuario_logado),
):
    livro = (
        db.query(models.Livro)
        .filter(models.Livro.id == livro_id, models.Livro.autor_id == usuario_id)
        .first()
    )
    if not livro:
        raise HTTPException(
            status_code=404, detail="Livro não encontrado ou não pertence a você"
        )

    db.delete(livro)
    db.commit()
    return {"mensagem": "Livro deletado com sucesso"}


# --- NOVAS ROTAS: Editar e Excluir Capítulos ---


@app.put("/capitulos/{capitulo_id}", response_model=schemas.CapituloResposta)
def atualizar_capitulo(
    capitulo_id: int,
    capitulo_atualizado: schemas.CapituloCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(obter_usuario_logado),
):
    capitulo = (
        db.query(models.Capitulo).filter(models.Capitulo.id == capitulo_id).first()
    )
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")

    capitulo.titulo_do_capitulo = capitulo_atualizado.titulo_do_capitulo
    capitulo.conteudo_texto = capitulo_atualizado.conteudo_texto

    db.commit()
    db.refresh(capitulo)
    return capitulo


@app.delete("/capitulos/{capitulo_id}")
def deletar_capitulo(
    capitulo_id: int,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(obter_usuario_logado),
):
    capitulo = (
        db.query(models.Capitulo).filter(models.Capitulo.id == capitulo_id).first()
    )
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")

    db.delete(capitulo)
    db.commit()
    return {"mensagem": "Capítulo deletado com sucesso"}


codigos_recuperacao = {}


@app.post("/gerar-codigo-senha")
def gerar_codigo(pedido: schemas.PedidoRecuperacao, db: Session = Depends(get_db)):
    usuario = (
        db.query(models.Usuario).filter(models.Usuario.email == pedido.email).first()
    )

    if usuario:
        codigo = str(random.randint(100000, 999999))
        codigos_recuperacao[pedido.email] = codigo

        # SIMULA O ENVIO DE E-MAIL IMPRIMINDO NO TERMINAL DO DOCKER
        print("\n" + "=" * 50, flush=True)
        print(f"📧 E-MAIL SIMULADO PARA: {pedido.email}", flush=True)
        print(f"🔑 Seu código de recuperação é: {codigo}", flush=True)
        print("=" * 50 + "\n", flush=True)

    # Retornamos sucesso mesmo se o e-mail não existir por segurança (evita vazar quem tem conta)
    return {"mensagem": "Se o e-mail estiver cadastrado, o código foi gerado."}


@app.post("/resetar-senha")
def resetar_senha(dados: schemas.ResetSenha, db: Session = Depends(get_db)):
    codigo_salvo = codigos_recuperacao.get(dados.email)

    if not codigo_salvo or codigo_salvo != dados.codigo:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado.")

    usuario = (
        db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # ATENÇÃO: Verifique como sua função de hash se chama!
    # Pode ser get_password_hash, auth.obter_hash_senha, pwd_context.hash...
    # Use a MESMA que você usa na sua rota de POST /usuarios/
    usuario.senha_hash = security.obter_hash_senha(dados.nova_senha)

    db.commit()
    del codigos_recuperacao[dados.email]  # Apaga o código após o uso

    return {"mensagem": "Senha atualizada com sucesso!"}


# --- NOVA ROTA: O Entregador de Imagens ---
@app.get("/capas/{nome_arquivo}")
def obter_capa(nome_arquivo: str):
    caminho = f".capas/{nome_arquivo}"
    if os.path.exists(caminho):
        return FileResponse(caminho)
    raise HTTPException(status_code=404, detail="Capa não encontrada")


# --- ROTA ATUALIZADA: O Recebedor de Imagens ---
@app.post("/upload-capa")
def upload_capa(file: UploadFile = File(...)):
    extensao = file.filename.split(".")[-1]
    nome_ficheiro = f"{int(time.time())}_{uuid.uuid4().hex[:8]}.{extensao}"
    caminho = f".capas/{nome_ficheiro}"

    with open(caminho, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ATENÇÃO: A URL agora aponta para a nossa rota nova /capas/ (sem o static)
    return {"url_capa": f"http://localhost:8000/capas/{nome_ficheiro}"}
