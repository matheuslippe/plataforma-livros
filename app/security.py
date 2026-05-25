from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from . import models

# Configuração de Criptografia
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "chave_super_secreta_da_plataforma"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Esquema de autenticação
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- Funções de Senha ---


def obter_hash_senha(senha: str):
    return pwd_context.hash(senha)


def verificar_senha(senha_pura: str, senha_criptografada: str):
    return pwd_context.verify(senha_pura, senha_criptografada)


# --- Funções de Token ---


def criar_token_acesso(dados: dict):
    dados_copia = dados.copy()
    expiracao = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    dados_copia.update({"exp": expiracao})
    token_jwt = jwt.encode(dados_copia, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt


def obter_usuario_atual(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id: str = payload.get("sub")
        if usuario_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    usuario = (
        db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    )
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    return usuario
