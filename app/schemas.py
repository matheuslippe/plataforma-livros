from pydantic import BaseModel
from typing import Optional

# --- Esquemas para Usuários ---


class UsuarioCriar(BaseModel):
    username: str
    nome_perfil: str
    email: str
    senha: str


class UsuarioAtualizar(BaseModel):
    nome_perfil: str | None = None
    bio: str | None = None
    redes_sociais: str | None = None
    url_foto_perfil: str | None = None
    url_capa_perfil: str | None = None


class UsuarioResposta(BaseModel):
    id: int
    username: str
    nome_perfil: str
    email: str
    url_foto_perfil: str | None = None
    url_capa_perfil: str | None = None
    bio: str | None = None
    redes_sociais: str | None = None
    data_cadastro: str | None = None

    class Config:
        from_attributes = True


class AutorResposta(BaseModel):
    id: int
    username: str
    url_foto_perfil: str | None = None

    class Config:
        from_attributes = True


# --- Esquemas para Livros ---


class LivroCriar(BaseModel):
    titulo: str
    sinopse: str
    url_capa: str | None = None
    idioma: str
    tipo_historia: str
    tags: str | None = None
    direitos_autorais: str
    classificacao_adulto: bool = False
    personagens_principais: str | None = None
    publico_alvo: str


class LivroResposta(BaseModel):
    id: int
    titulo: str
    sinopse: str
    autor_id: int
    url_capa: str | None = None
    idioma: str
    tipo_historia: str
    tags: str | None = None
    direitos_autorais: str
    classificacao_adulto: bool
    personagens_principais: str | None = None
    publico_alvo: str
    visualizacoes: int
    curtidas_totales: int
    autor: AutorResposta

    class Config:
        from_attributes = True


# --- Esquemas para Capítulos ---


class CapituloCriar(BaseModel):
    livro_id: int
    titulo_do_capitulo: str
    conteudo_texto: str
    ordem_leitura: int


class CapituloResposta(BaseModel):
    id: int
    livro_id: int
    titulo_do_capitulo: str
    conteudo_texto: str
    ordem_leitura: int
    visualizacoes: int
    curtidas_totales: int

    class Config:
        from_attributes = True


# --- Esquemas de Segurança e Recuperação ---


class PedidoRecuperacao(BaseModel):
    email: str


class ResetSenha(BaseModel):
    email: str
    codigo: str
    nova_senha: str


# ESQUEMAS DE LISTAS DE LEITURA


class ListaLeituraCriar(BaseModel):
    nome: str
    descricao: str | None = None


class ListaLeituraResposta(BaseModel):
    id: int
    nome: str
    descricao: str | None
    usuario_id: int

    # O Pydantic é inteligente: ele vai puxar a lista de livros completa
    # reaproveitando a classe LivroResposta que você já criou antes!
    livros: list[LivroResposta] = []

    class Config:
        from_attributes = True
