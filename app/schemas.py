from pydantic import BaseModel


# Formato que o App/Site precisa enviar para a API
class UsuarioCriar(BaseModel):
    nome: str
    email: str
    senha: str


# Formato que a API devolve para o App/Site depois de salvar
class UsuarioResposta(BaseModel):
    id: int
    nome: str
    email: str

    class Config:
        from_attributes = True
