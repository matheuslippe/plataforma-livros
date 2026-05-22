import { useState, useEffect } from 'react'

function App() {
  const [token, setToken] = useState(localStorage.getItem('meu_token_jwt') || '')

  // Estados do Login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')

  // Estados da Vitrine
  const [livros, setLivros] = useState([])
  const [tituloNovo, setTituloNovo] = useState('')
  const [sinopseNova, setSinopseNova] = useState('')

  // Estados dos Capítulos (A Mágica Nova Aqui)
  const [livroSelecionado, setLivroSelecionado] = useState(null)
  const [capitulos, setCapitulos] = useState([])
  const [tituloCapitulo, setTituloCapitulo] = useState('')
  const [conteudoCapitulo, setConteudoCapitulo] = useState('')

  useEffect(() => {
    if (token && !livroSelecionado) {
      buscarLivros()
    }
  }, [token, livroSelecionado])

  // --- FUNÇÕES DE CONEXÃO COM A API ---

  const fazerLogin = async (e) => {
    e.preventDefault()
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', senha)

    try {
      const resposta = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      })
      if (resposta.ok) {
        const dados = await resposta.json()
        localStorage.setItem('meu_token_jwt', dados.access_token)
        setToken(dados.access_token)
      } else {
        setMensagem('E-mail ou senha incorretos.')
      }
    } catch (erro) {
      setMensagem('Erro ao conectar com a API.')
    }
  }

  const buscarLivros = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/livros/')
      if (resposta.ok) {
        const dados = await resposta.json()
        setLivros(dados)
      }
    } catch (erro) {
      console.error("Erro ao buscar livros")
    }
  }

  const criarLivro = async (e) => {
    e.preventDefault()
    try {
      const resposta = await fetch('http://localhost:8000/livros/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ titulo: tituloNovo, sinopse: sinopseNova, url_capa: "https://via.placeholder.com/150" })
      })
      if (resposta.ok) {
        setTituloNovo('')
        setSinopseNova('')
        buscarLivros()
      }
    } catch (erro) {
      console.error("Erro de conexão")
    }
  }

  // Busca os capítulos de um livro específico
  const abrirLivro = async (livro) => {
    setLivroSelecionado(livro)
    try {
      const resposta = await fetch(`http://localhost:8000/livros/${livro.id}/capitulos`)
      if (resposta.ok) {
        const dados = await resposta.json()
        setCapitulos(dados)
      }
    } catch (erro) {
      console.error("Erro ao buscar capítulos")
    }
  }

  // Cria um capítulo novo atrelado ao livro aberto
  const criarCapitulo = async (e) => {
    e.preventDefault()
    try {
      const resposta = await fetch('http://localhost:8000/capitulos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          livro_id: livroSelecionado.id,
          titulo_do_capitulo: tituloCapitulo,
          conteudo_texto: conteudoCapitulo,
          ordem_leitura: capitulos.length + 1 // Calcula a ordem automaticamente
        })
      })
      if (resposta.ok) {
        setTituloCapitulo('')
        setConteudoCapitulo('')
        abrirLivro(livroSelecionado) // Atualiza a lista na hora
      }
    } catch (erro) {
      console.error("Erro ao salvar capítulo")
    }
  }

  const sair = () => {
    localStorage.removeItem('meu_token_jwt')
    setToken('')
    setLivros([])
    setLivroSelecionado(null)
  }

  // --- TELA 3: LENDO/ESCREVENDO UM LIVRO ESPECÍFICO ---
  if (token && livroSelecionado) {
    return (
      <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
        <button onClick={() => setLivroSelecionado(null)} style={{ padding: '8px 16px', cursor: 'pointer', marginBottom: '20px' }}>
          ← Voltar para a Vitrine
        </button>

        <h1>{livroSelecionado.titulo}</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>{livroSelecionado.sinopse}</p>

        {/* Formulário de Novo Capítulo */}
        <div style={{ background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Escrever Novo Capítulo</h3>
          <form onSubmit={criarCapitulo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Título do Capítulo"
              value={tituloCapitulo}
              onChange={(e) => setTituloCapitulo(e.target.value)}
              required
              style={{ padding: '8px' }}
            />
            <textarea
              placeholder="Escreva sua história aqui..."
              value={conteudoCapitulo}
              onChange={(e) => setConteudoCapitulo(e.target.value)}
              required
              style={{ padding: '8px', height: '100px', resize: 'vertical' }}
            />
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', background: '#0066cc', color: 'white', border: 'none', alignSelf: 'flex-start' }}>
              Publicar Capítulo
            </button>
          </form>
        </div>

        {/* Lista de Capítulos */}
        <h3>Índice</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {capitulos.length === 0 ? (
            <p>Nenhum capítulo escrito ainda. Comece sua história!</p>
          ) : (
            capitulos.map((cap) => (
              <div key={cap.id} style={{ borderLeft: '4px solid #0066cc', paddingLeft: '15px', background: '#fafafa', padding: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Capítulo {cap.ordem_leitura}: {cap.titulo_do_capitulo}</h4>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{cap.conteudo_texto}</p>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // --- TELA 2: VITRINE (Logado, nenhum livro selecionado) ---
  if (token && !livroSelecionado) {
    return (
      <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Painel da Plataforma</h1>
          <button onClick={sair} style={{ padding: '8px 16px', cursor: 'pointer', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px' }}>Sair</button>
        </div>

        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Adicionar Novo Livro</h3>
          <form onSubmit={criarLivro} style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Título do Livro" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} required style={{ padding: '8px', flex: 1 }} />
            <input type="text" placeholder="Sinopse rápida" value={sinopseNova} onChange={(e) => setSinopseNova(e.target.value)} required style={{ padding: '8px', flex: 2 }} />
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none' }}>Salvar Livro</button>
          </form>
        </div>

        <h3>Meus Livros</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {livros.length === 0 ? <p>Nenhum livro cadastrado ainda.</p> : (
            livros.map((livro) => (
              <div key={livro.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', width: '250px', background: 'white' }}>
                <img src={livro.url_capa} alt="Capa" style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 10px 0' }}>{livro.titulo}</h4>
                <p style={{ fontSize: '14px', color: '#666' }}>{livro.sinopse}</p>
                {/* O BOTÃO AGORA CHAMA A FUNÇÃO abrirLivro */}
                <button onClick={() => abrirLivro(livro)} style={{ width: '100%', padding: '8px', marginTop: '10px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Ler / Escrever Capítulos
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // --- TELA 1: LOGIN ---
  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Entrar na Plataforma</h1>
      <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '15px' }}>
        <input type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Sua Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Entrar</button>
      </form>
      {mensagem && <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{mensagem}</p>}
    </div>
  )
}

export default App