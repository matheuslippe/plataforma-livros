from pydantic import BaseModel
from typing import Optional

# --- Esquemas para Usuários ---


class UsuarioCriar(BaseModel):
    nome: str
    email: str
    senha: str


class UsuarioResposta(BaseModel):
    id: int
    nome: str
    email: str

    class Config:
        from_attributes = True


# --- Esquemas para Livros ---


class LivroCriar(BaseModel):
    titulo: str
    sinopse: str
    autor_id: int
    url_capa: Optional[str] = None


class LivroResposta(BaseModel):
    id: int
    titulo: str
    sinopse: str
    autor_id: int

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
    status: str

    class Config:
        from_attributes = True
