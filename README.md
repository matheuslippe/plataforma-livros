# ✒️ Páginas: Plataforma de Publicação Literária

## Visão Geral
O Páginas é uma plataforma Full Stack desenvolvida para democratizar a escrita e leitura literária. A aplicação oferece um espaço onde autores podem publicar suas obras anonimamente ou via perfil de autor, gerenciar capítulos de forma organizada e interagir com leitores através de um motor social que contabiliza visualizações e curtidas por capítulo.

## Funcionalidades
* **Autenticação Segura:** Sistema de login via JWT com suporte a recuperação de senha.
* **Publicação Profissional:** Cadastro de obras com metadados detalhados (idioma, tags, direitos autorais, classificação +18, etc).
* **Motor Social por Capítulo:** Contagem precisa de visualizações e sistema de "curtidas" individualizado por capítulo.
* **Gestão de Perfil:** Identidade de autor com @username e nome de perfil personalizado.
* **Leitura Imersiva:** Interface otimizada para foco na leitura e navegação intuitiva por índices.

## Tecnologias Utilizadas
* **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL.
* **Frontend:** React, Tailwind CSS.
* **Orquestração:** Docker & Docker Compose.
* **Segurança:** Passlib/Bcrypt para senhas e JWT para tokens de sessão.


## Como Executar
### Pré-requisitos
- Docker e Docker Compose instalados.

### Rodando o ambiente de desenvolvimento
No diretório raiz do projeto, execute:
```bash
docker-compose up --build
```

## Contribuição
Para contribuir com o projeto:
1. Crie uma branch para sua funcionalidade ou correção.
2. Abra um Pull Request (PR) no GitHub.
3. Certifique-se de que o CI passa em todos os testes e builds.
4. Aguarde a revisão do código.
