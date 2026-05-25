from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app import models, schemas, security
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from collections import defaultdict
from fastapi.staticfiles import StaticFiles
import uuid
import random
import os
import shutil
import time

# Cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma de Livros")

# Configuração de arquivos estáticos (capas)
os.makedirs(".capas", exist_ok=True)
app.mount("/static", StaticFiles(directory=".capas"), name="static")

# Middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rotas Raiz ---


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
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    return usuario_atual


@app.put("/usuarios/me", response_model=schemas.UsuarioResposta)
def atualizar_meu_perfil(
    dados_atualizacao: schemas.UsuarioAtualizar,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    if dados_atualizacao.nome_perfil is not None:
        usuario_atual.nome_perfil = dados_atualizacao.nome_perfil
    if dados_atualizacao.bio is not None:
        usuario_atual.bio = dados_atualizacao.bio
    if dados_atualizacao.redes_sociais is not None:
        usuario_atual.redes_sociais = dados_atualizacao.redes_sociais
    if dados_atualizacao.url_foto_perfil is not None:
        usuario_atual.url_foto_perfil = dados_atualizacao.url_foto_perfil
    if dados_atualizacao.url_capa_perfil is not None:
        usuario_atual.url_capa_perfil = dados_atualizacao.url_capa_perfil

    db.commit()
    db.refresh(usuario_atual)
    return usuario_atual


@app.get("/usuarios/{usuario_id}")
def obter_perfil_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Isso transforma o modelo SQLAlchemy em um dicionário simples que o Pydantic/FastAPI aceita facilmente
    return usuario.__dict__


# --- Rotas de Livros ---


@app.post("/livros/", response_model=schemas.LivroResposta)
def criar_livro(
    livro: schemas.LivroCriar,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    novo_livro = models.Livro(
        titulo=livro.titulo,
        sinopse=livro.sinopse,
        autor_id=usuario_atual.id,
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
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    livro = (
        db.query(models.Livro)
        .filter(models.Livro.id == livro_id, models.Livro.autor_id == usuario_atual.id)
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
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    livro = (
        db.query(models.Livro)
        .filter(models.Livro.id == livro_id, models.Livro.autor_id == usuario_atual.id)
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
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
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


@app.put("/capitulos/{capitulo_id}", response_model=schemas.CapituloResposta)
def atualizar_capitulo(
    capitulo_id: int,
    capitulo_atualizado: schemas.CapituloCriar,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
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
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    capitulo = (
        db.query(models.Capitulo).filter(models.Capitulo.id == capitulo_id).first()
    )
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    db.delete(capitulo)
    db.commit()
    return {"mensagem": "Capítulo deletado com sucesso"}


# --- Motor Social ---


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
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
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
            models.Curtida.usuario_id == usuario_atual.id,
        )
        .first()
    )
    if curtida_existente:
        db.delete(curtida_existente)
        capitulo.curtidas_totales = max(0, capitulo.curtidas_totales - 1)
        mensagem, curtido = "Curtida removida", False
    else:
        nova_curtida = models.Curtida(
            usuario_id=usuario_atual.id, capitulo_id=capitulo_id
        )
        db.add(nova_curtida)
        capitulo.curtidas_totales += 1
        mensagem, curtido = "Capítulo curtido com sucesso", True

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
        print(f"\n🔑 CÓDIGO RECUPERAÇÃO: {codigo}\n", flush=True)
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
    return {"url_imagem": f"{str(request.base_url)}capas/{nome_ficheiro}"}


# --- Explorar e Listas de Leitura ---


@app.get("/explorar/tags-em-alta")
def obter_tags_em_alta(db: Session = Depends(get_db)):
    livros = db.query(models.Livro).all()
    pontuacao_tags = defaultdict(int)
    for livro in livros:
        if livro.tags:
            pontos = (livro.visualizacoes or 0) + ((livro.curtidas_totales or 0) * 3)
            for tag in [t.strip().lower() for t in livro.tags.split(",") if t]:
                pontuacao_tags[tag] += pontos
    top_tags = [
        {"nome": k, "pontos": v}
        for k, v in sorted(pontuacao_tags.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    return top_tags


@app.get("/explorar/livros-por-tag", response_model=list[schemas.LivroResposta])
def obter_livros_por_tag(tag: str, db: Session = Depends(get_db)):
    tag_limpa = tag.strip().lower()

    # 1. Busca os livros no banco (sem o order_by e sem o limit)
    livros_encontrados = (
        db.query(models.Livro).filter(models.Livro.tags.ilike(f"%{tag_limpa}%")).all()
    )

    # 2. Ordena os livros no Python usando a propriedade 'visualizacoes' (do maior para o menor)
    # Usamos (l.visualizacoes or 0) para evitar erros caso o livro não tenha visualizações
    livros_ordenados = sorted(
        livros_encontrados, key=lambda l: l.visualizacoes or 0, reverse=True
    )

    # 3. Retorna apenas os 10 primeiros
    return livros_ordenados[:10]


@app.post("/listas/", response_model=schemas.ListaLeituraResposta)
def criar_lista(
    lista: schemas.ListaLeituraCriar,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    nova_lista = models.ListaLeitura(
        nome=lista.nome, descricao=lista.descricao, usuario_id=usuario_atual.id
    )
    db.add(nova_lista)
    db.commit()
    db.refresh(nova_lista)
    return nova_lista


@app.get("/usuarios/me/listas", response_model=list[schemas.ListaLeituraResposta])
def minhas_listas(
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    return (
        db.query(models.ListaLeitura)
        .filter(models.ListaLeitura.usuario_id == usuario_atual.id)
        .all()
    )


@app.post("/listas/{lista_id}/adicionar/{livro_id}")
def adicionar_livro_na_lista(
    lista_id: int,
    livro_id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    lista = (
        db.query(models.ListaLeitura)
        .filter(
            models.ListaLeitura.id == lista_id,
            models.ListaLeitura.usuario_id == usuario_atual.id,
        )
        .first()
    )
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    livro = db.query(models.Livro).filter(models.Livro.id == livro_id).first()
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    if livro in lista.livros:
        raise HTTPException(status_code=400, detail="Este livro já está na lista")
    lista.livros.append(livro)
    db.commit()
    return {"mensagem": "Livro adicionado com sucesso!"}


@app.delete("/listas/{lista_id}/remover/{livro_id}")
def remover_livro_da_lista(
    lista_id: int,
    livro_id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    lista = (
        db.query(models.ListaLeitura)
        .filter(
            models.ListaLeitura.id == lista_id,
            models.ListaLeitura.usuario_id == usuario_atual.id,
        )
        .first()
    )
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    livro = db.query(models.Livro).filter(models.Livro.id == livro_id).first()
    if livro in lista.livros:
        lista.livros.remove(livro)
        db.commit()
        return {"mensagem": "Livro removido da lista."}
    raise HTTPException(status_code=400, detail="O livro não está nesta lista.")


@app.post("/usuarios/{usuario_id}/seguir")
def seguir_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    if usuario_id == usuario_atual.id:
        raise HTTPException(status_code=400, detail="Você não pode seguir a si mesmo.")

    usuario_a_seguir = (
        db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    )
    if not usuario_a_seguir:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if usuario_a_seguir not in usuario_atual.seguindo:
        usuario_atual.seguindo.append(usuario_a_seguir)
        db.commit()

    return {"mensagem": f"Você agora segue {usuario_a_seguir.username}"}


@app.delete("/usuarios/{usuario_id}/deixar-de-seguir")
def deixar_de_seguir(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(security.obter_usuario_atual),
):
    usuario_alvo = (
        db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    )
    if usuario_alvo in usuario_atual.seguindo:
        usuario_atual.seguindo.remove(usuario_alvo)
        db.commit()
        return {"mensagem": f"Você deixou de seguir {usuario_alvo.username}"}

    raise HTTPException(status_code=400, detail="Você não segue este usuário.")
