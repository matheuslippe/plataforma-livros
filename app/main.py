from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app import models, schemas, security
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from collections import defaultdict
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
import uuid
import random
import os
import shutil
import time

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma de Livros")

os.makedirs(".capas", exist_ok=True)
app.mount("/static", StaticFiles(directory=".capas"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cadeado = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(token: str = Depends(cadeado)):
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
    if not usuario or not security.verificar_senha(form_data.password, usuario.senha):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos")

    token = security.criar_token_acesso(dados={"sub": str(usuario.id)})
    return {"access_token": token, "token_type": "bearer", "usuario_id": usuario.id}


# --- Rotas de Usuários ---


@app.post("/usuarios/", response_model=schemas.UsuarioResposta)
def criar_usuario(usuario: schemas.UsuarioCriar, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    if (
        db.query(models.Usuario)
        .filter(models.Usuario.username == usuario.username)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Esse @ já está em uso")

    senha_criptografada = security.obter_hash_senha(usuario.senha)
    novo_usuario = models.Usuario(
        username=usuario.username,
        nome_perfil=usuario.nome_perfil,
        email=usuario.email,
        senha=senha_criptografada,
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


@app.get("/usuarios/me", response_model=schemas.UsuarioResposta)
def obter_meu_perfil(
    db: Session = Depends(get_db), usuario_id: int = Depends(get_current_user)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario


@app.put("/usuarios/me", response_model=schemas.UsuarioResposta)
def atualizar_meu_perfil(
    dados_atualizacao: schemas.UsuarioAtualizar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Atualiza apenas os campos que o React enviou
    if dados_atualizacao.nome_perfil is not None:
        usuario.nome_perfil = dados_atualizacao.nome_perfil
    if dados_atualizacao.bio is not None:
        usuario.bio = dados_atualizacao.bio
    if dados_atualizacao.redes_sociais is not None:
        usuario.redes_sociais = dados_atualizacao.redes_sociais
    if dados_atualizacao.url_foto_perfil is not None:
        usuario.url_foto_perfil = dados_atualizacao.url_foto_perfil
    if dados_atualizacao.url_capa_perfil is not None:
        usuario.url_capa_perfil = dados_atualizacao.url_capa_perfil

    db.commit()
    db.refresh(usuario)
    return usuario


# --- Rotas de Livros ---


@app.post("/livros/", response_model=schemas.LivroResposta)
def criar_livro(
    livro: schemas.LivroCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
):
    novo_livro = models.Livro(
        titulo=livro.titulo,
        sinopse=livro.sinopse,
        autor_id=usuario_id,
        url_capa=livro.url_capa,
        idioma=livro.idioma,
        tipo_historia=livro.tipo_historia,
        tags=livro.tags,
        direitos_autorais=livro.direitos_autorais,
        classificacao_adulto=livro.classificacao_adulto,
        personagens_principais=livro.personagens_principais,
        publico_alvo=livro.publico_alvo,
    )
    db.add(novo_livro)
    db.commit()
    db.refresh(novo_livro)
    return novo_livro


@app.get("/livros/", response_model=list[schemas.LivroResposta])
def listar_livros(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(models.Livro).offset(skip).limit(limit).all()


@app.put("/livros/{livro_id}", response_model=schemas.LivroResposta)
def atualizar_livro(
    livro_id: int,
    livro_atualizado: schemas.LivroCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
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

    livro.titulo = livro_atualizado.titulo
    livro.sinopse = livro_atualizado.sinopse
    if livro_atualizado.url_capa:
        livro.url_capa = livro_atualizado.url_capa

    livro.idioma = livro_atualizado.idioma
    livro.tipo_historia = livro_atualizado.tipo_historia
    livro.tags = livro_atualizado.tags
    livro.direitos_autorais = livro_atualizado.direitos_autorais
    livro.classificacao_adulto = livro_atualizado.classificacao_adulto
    livro.personagens_principais = livro_atualizado.personagens_principais
    livro.publico_alvo = livro_atualizado.publico_alvo

    db.commit()
    db.refresh(livro)
    return livro


@app.delete("/livros/{livro_id}")
def deletar_livro(
    livro_id: int,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
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


# --- Rotas de Capítulos ---


@app.post("/capitulos/", response_model=schemas.CapituloResposta)
def criar_capitulo(
    capitulo: schemas.CapituloCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
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
def listar_capitulos_do_livro(
    livro_id: int,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
):
    return (
        db.query(models.Capitulo)
        .filter(models.Capitulo.livro_id == livro_id)
        .order_by(models.Capitulo.ordem_leitura)
        .all()
    )


@app.put("/capitulos/{capitulo_id}", response_model=schemas.CapituloResposta)
def atualizar_capitulo(
    capitulo_id: int,
    capitulo_atualizado: schemas.CapituloCriar,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
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
    usuario_id: int = Depends(get_current_user),
):
    capitulo = (
        db.query(models.Capitulo).filter(models.Capitulo.id == capitulo_id).first()
    )
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")

    db.delete(capitulo)
    db.commit()
    return {"mensagem": "Capítulo deletado com sucesso"}


# --- NOVAS ROTAS: Motor Social por Capítulo ---


@app.post("/capitulos/{capitulo_id}/visualizar")
def registrar_visualizacao_capitulo(capitulo_id: int, db: Session = Depends(get_db)):
    capitulo = (
        db.query(models.Capitulo).filter(models.Capitulo.id == capitulo_id).first()
    )
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")

    capitulo.visualizacoes += 1
    db.commit()
    db.refresh(capitulo)
    return {
        "mensagem": "Visualização registrada",
        "visualizacoes": capitulo.visualizacoes,
    }


@app.post("/capitulos/{capitulo_id}/curtir")
def curtir_capitulo(
    capitulo_id: int,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(get_current_user),
):
    capitulo = (
        db.query(models.Capitulo).filter(models.Capitulo.id == capitulo_id).first()
    )
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")

    curtida_existente = (
        db.query(models.Curtida)
        .filter(
            models.Curtida.capitulo_id == capitulo_id,
            models.Curtida.usuario_id == usuario_id,
        )
        .first()
    )

    if curtida_existente:
        db.delete(curtida_existente)
        capitulo.curtidas_totales = max(0, capitulo.curtidas_totales - 1)
        mensagem = "Curtida removida"
        curtido = False
    else:
        nova_curtida = models.Curtida(usuario_id=usuario_id, capitulo_id=capitulo_id)
        db.add(nova_curtida)
        capitulo.curtidas_totales += 1
        mensagem = "Capítulo curtido com sucesso"
        curtido = True

    db.commit()
    db.refresh(capitulo)
    return {
        "mensagem": mensagem,
        "curtido": curtido,
        "curtidas_totales": capitulo.curtidas_totales,
    }


# --- Recuperação de Senha & Imagens ---

codigos_recuperacao = {}


@app.post("/gerar-codigo-senha")
def gerar_codigo(pedido: schemas.PedidoRecuperacao, db: Session = Depends(get_db)):
    usuario = (
        db.query(models.Usuario).filter(models.Usuario.email == pedido.email).first()
    )
    if usuario:
        codigo = str(random.randint(100000, 999999))
        codigos_recuperacao[pedido.email] = codigo
        print("\n" + "=" * 50, flush=True)
        print(f"📧 E-MAIL SIMULADO PARA: {pedido.email}", flush=True)
        print(f"🔑 Seu código de recuperação é: {codigo}", flush=True)
        print("=" * 50 + "\n", flush=True)
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

    usuario.senha = security.obter_hash_senha(dados.nova_senha)
    db.commit()
    del codigos_recuperacao[dados.email]
    return {"mensagem": "Senha atualizada com sucesso!"}


@app.get("/capas/{nome_arquivo}")
def obter_capa(nome_arquivo: str):
    caminho = f".capas/{nome_arquivo}"
    if os.path.exists(caminho):
        return FileResponse(caminho)
    raise HTTPException(status_code=404, detail="Capa não encontrada")


@app.post("/upload-imagem")
def upload_imagem(request: Request, file: UploadFile = File(...)):
    extensao = file.filename.split(".")[-1]
    nome_ficheiro = f"{int(time.time())}_{uuid.uuid4().hex[:8]}.{extensao}"
    caminho = f".capas/{nome_ficheiro}"
    with open(caminho, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    base_url = str(request.base_url)
    return {"url_imagem": f"{base_url}capas/{nome_ficheiro}"}


# ==========================================
# ROTAS DO EXPLORAR (ALGORITMO DE RECOMENDAÇÃO)
# ==========================================


@app.get("/explorar/tags-em-alta")
def obter_tags_em_alta(db: Session = Depends(get_db)):
    """
    Analisa todos os livros e descobre quais tags estão bombando
    com base nas visualizações e curtidas.
    """
    livros = db.query(models.Livro).all()
    pontuacao_tags = defaultdict(int)

    for livro in livros:
        if livro.tags:
            # 1 View = 1 ponto | 1 Curtida = 3 pontos
            pontos = (livro.visualizacoes or 0) + ((livro.curtidas_totales or 0) * 3)

            # Como salvamos as tags como texto (ex: "romance, magia"), separamos aqui
            tags_lista = [tag.strip().lower() for tag in livro.tags.split(",")]

            for tag in tags_lista:
                if tag:  # Ignora se estiver vazio
                    pontuacao_tags[tag] += pontos

    # Ordena as tags da maior pontuação para a menor
    tags_ordenadas = sorted(pontuacao_tags.items(), key=lambda x: x[1], reverse=True)

    # Pega apenas as 5 tags mais populares no momento
    top_tags = [{"nome": k, "pontos": v} for k, v in tags_ordenadas[:5]]

    return top_tags


@app.get("/explorar/livros-por-tag", response_model=list[schemas.LivroResposta])
def obter_livros_por_tag(tag: str, db: Session = Depends(get_db)):
    """
    Busca os melhores livros que contêm uma tag específica,
    ordenados pelos mais vistos primeiro.
    """
    # O comando .ilike(f"%{tag}%") procura a palavra dentro do texto da tag
    livros = (
        db.query(models.Livro)
        .filter(models.Livro.tags.ilike(f"%{tag}%"))
        .order_by(models.Livro.visualizacoes.desc())  # Os mais famosos primeiro
        .limit(10)  # Traz só os 10 melhores dessa tag
        .all()
    )
    return livros
