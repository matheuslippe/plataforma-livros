from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

# ==========================================
# TABELAS DE ASSOCIAÇÃO (Pontes)
# ==========================================

# Verificação para evitar erro de tabela já definida durante hot-reload
if "seguidores" not in Base.metadata.tables:
    seguidores = Table(
        "seguidores",
        Base.metadata,
        Column(
            "seguidor_id",
            Integer,
            ForeignKey("usuarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        Column(
            "seguido_id",
            Integer,
            ForeignKey("usuarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        extend_existing=True,
    )
else:
    seguidores = Base.metadata.tables["seguidores"]

if "lista_livro" not in Base.metadata.tables:
    lista_livro_associacao = Table(
        "lista_livro",
        Base.metadata,
        Column(
            "lista_id", Integer, ForeignKey("listas_leitura.id", ondelete="CASCADE")
        ),
        Column("livro_id", Integer, ForeignKey("livros.id", ondelete="CASCADE")),
        extend_existing=True,
    )
else:
    lista_livro_associacao = Base.metadata.tables["lista_livro"]


# ==========================================
# MODELOS PRINCIPAIS
# ==========================================


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    nome_perfil = Column(String)
    email = Column(String, unique=True, index=True)
    senha = Column(String)
    url_foto_perfil = Column(String, nullable=True)
    url_capa_perfil = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    redes_sociais = Column(String, nullable=True)
    data_cadastro = Column(String, default=lambda: datetime.now().strftime("%d/%m/%Y"))

    # Relacionamento de seguidores (Auto-relacionamento)
    seguindo = relationship(
        "Usuario",
        secondary=seguidores,
        primaryjoin=(seguidores.c.seguidor_id == id),
        secondaryjoin=(seguidores.c.seguido_id == id),
        backref="seguidores",
    )


class Livro(Base):
    __tablename__ = "livros"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    sinopse = Column(String)
    url_capa = Column(String, nullable=True)
    autor_id = Column(Integer, ForeignKey("usuarios.id"))
    idioma = Column(String, default="Português")
    tipo_historia = Column(String)
    tags = Column(String, nullable=True)
    direitos_autorais = Column(String)
    classificacao_adulto = Column(Boolean, default=False)
    personagens_principais = Column(String, nullable=True)
    publico_alvo = Column(String)

    autor = relationship("Usuario")
    capitulos = relationship(
        "Capitulo", back_populates="livro", cascade="all, delete-orphan"
    )

    @property
    def visualizacoes(self):
        return sum(cap.visualizacoes for cap in self.capitulos) if self.capitulos else 0

    @property
    def curtidas_totales(self):
        return (
            sum(cap.curtidas_totales for cap in self.capitulos) if self.capitulos else 0
        )


class Capitulo(Base):
    __tablename__ = "capitulos"

    id = Column(Integer, primary_key=True, index=True)
    livro_id = Column(Integer, ForeignKey("livros.id"))
    titulo_do_capitulo = Column(String)
    conteudo_texto = Column(String)
    ordem_leitura = Column(Integer)
    visualizacoes = Column(Integer, default=0)
    curtidas_totales = Column(Integer, default=0)

    livro = relationship("Livro", back_populates="capitulos")


class Curtida(Base):
    __tablename__ = "curtidas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    capitulo_id = Column(Integer, ForeignKey("capitulos.id"))


class ListaLeitura(Base):
    __tablename__ = "listas_leitura"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    dono = relationship("Usuario")
    livros = relationship("Livro", secondary=lista_livro_associacao)
