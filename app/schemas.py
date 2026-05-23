from pydantic import BaseModel
from typing import Optional

# --- Esquemas para Usuários ---


class UsuarioCriar(BaseModel):
    username: str
    nome_perfil: str
    email: str
    senha: str


class UsuarioResposta(BaseModel):
    id: int
    username: str
    nome_perfil: str
    email: str

    class Config:
        from_attributes = True


class AutorResposta(BaseModel):
    username: str
    nome_perfil: str

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
