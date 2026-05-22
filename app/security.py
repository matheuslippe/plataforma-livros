from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

# Define qual algoritmo de criptografia vamos usar (bcrypt é o padrão de mercado)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# O segredo da sua API (É com essa frase que ela assina os crachás)
SECRET_KEY = "chave_super_secreta_da_plataforma"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # O crachá vale por 1 hora


# Função para embaralhar a senha antes de salvar no banco
def obter_hash_senha(senha: str):
    return pwd_context.hash(senha)


# Função para checar se a senha que o usuário digitou bate com a do banco
def verificar_senha(senha_pura: str, senha_criptografada: str):
    return pwd_context.verify(senha_pura, senha_criptografada)


# Função que fabrica o crachá digital (Token JWT)
def criar_token_acesso(dados: dict):
    dados_copia = dados.copy()
    expiracao = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    dados_copia.update({"exp": expiracao})

    token_jwt = jwt.encode(dados_copia, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt
