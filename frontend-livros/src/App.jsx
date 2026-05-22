import { useState, useEffect } from 'react'

function App() {
  const [token, setToken] = useState(localStorage.getItem('meu_token_jwt') || '')
  const [usuarioId, setUsuarioId] = useState(Number(localStorage.getItem('meu_usuario_id')) || null)

  const [modoLogin, setModoLogin] = useState(true)
  const [etapaRecuperacao, setEtapaRecuperacao] = useState(0)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigoReset, setCodigoReset] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [livros, setLivros] = useState([])
  const [tituloNovo, setTituloNovo] = useState('')
  const [sinopseNova, setSinopseNova] = useState('')
  const [arquivoCapa, setArquivoCapa] = useState(null) // NOVO: Guarda o arquivo selecionado
  const [telaLivroAberta, setTelaLivroAberta] = useState(false)
  const [livroEditandoId, setLivroEditandoId] = useState(null)

  const [livroSelecionado, setLivroSelecionado] = useState(null)
  const [capitulos, setCapitulos] = useState([])
  const [tituloCapitulo, setTituloCapitulo] = useState('')
  const [conteudoCapitulo, setConteudoCapitulo] = useState('')
  const [capituloEditandoId, setCapituloEditandoId] = useState(null)

  useEffect(() => {
    if (token && !livroSelecionado) buscarLivros()
  }, [token, livroSelecionado])

  // --- FUNÇÕES DE API ---
  const pedirCodigo = async (e) => { e.preventDefault(); try { await fetch('http://localhost:8000/gerar-codigo-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) }); setEtapaRecuperacao(2); setMensagem('Verifique os logs da API para obter o código.'); } catch (erro) { setMensagem('Erro de conexão.'); } }
  const redefinirSenha = async (e) => { e.preventDefault(); try { const resposta = await fetch('http://localhost:8000/resetar-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, codigo: codigoReset, nova_senha: senha }) }); if (resposta.ok) { setMensagem('Senha atualizada! Faça o login.'); setEtapaRecuperacao(0); setSenha(''); setCodigoReset(''); } else { setMensagem('Código inválido.'); } } catch (erro) { setMensagem('Erro de conexão.'); } }
  const fazerCadastro = async (e) => { e.preventDefault(); try { const resposta = await fetch('http://localhost:8000/usuarios/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, senha: senha }) }); if (resposta.ok) { setMensagem('Conta criada com sucesso!'); setModoLogin(true); setSenha(''); } else { setMensagem('Erro ao criar conta.'); } } catch (erro) { setMensagem('Erro de conexão.'); } }
  const fazerLogin = async (e) => { e.preventDefault(); const formData = new URLSearchParams(); formData.append('username', email); formData.append('password', senha); try { const resposta = await fetch('http://localhost:8000/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData }); if (resposta.ok) { const dados = await resposta.json(); localStorage.setItem('meu_token_jwt', dados.access_token); localStorage.setItem('meu_usuario_id', dados.usuario_id); setToken(dados.access_token); setUsuarioId(dados.usuario_id); setMensagem(''); } else { setMensagem('E-mail ou senha incorretos.'); } } catch (erro) { setMensagem('Erro de conexão.'); } }
  const sair = () => { localStorage.removeItem('meu_token_jwt'); localStorage.removeItem('meu_usuario_id'); setToken(''); setUsuarioId(null); setLivros([]); setLivroSelecionado(null); setMensagem(''); setEtapaRecuperacao(0); setTelaLivroAberta(false); }
  const buscarLivros = async () => { try { const res = await fetch('http://localhost:8000/livros/'); if (res.ok) setLivros(await res.json()); } catch (e) { } }

  const salvarLivro = async (e) => {
    e.preventDefault()

    // Imagem padrão caso dê algo errado ou o usuário não envie nada
    let capaFinal = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"

    // 1. ENVIO DA IMAGEM
    if (arquivoCapa) {
      const formData = new FormData()
      formData.append('file', arquivoCapa) // O FastAPI espera exatamente 'file'

      try {
        // Removemos o header 'Authorization' daqui para evitar bloqueio do CORS no upload!
        const resUpload = await fetch('http://localhost:8000/upload-capa', {
          method: 'POST',
          body: formData
        })

        if (resUpload.ok) {
          const dadosUpload = await resUpload.json()
          capaFinal = dadosUpload.url_capa
        } else {
          // Se o Python recusar, o React vai estourar esse alerta na sua tela
          alert("O Python recusou a imagem! Código do erro: " + resUpload.status)
          return // Para a execução aqui para não salvar livro quebrado
        }
      } catch (erro) {
        // Se o React nem conseguir chegar no Python, avisa aqui
        alert("O React não conseguiu enviar a foto para a API: " + erro.message)
        return
      }
    } else if (livroEditandoId) {
      const livroAntigo = livros.find(l => l.id === livroEditandoId)
      if (livroAntigo) capaFinal = livroAntigo.url_capa
    }

    // 2. CRIAÇÃO DO LIVRO
    const url = livroEditandoId ? `http://localhost:8000/livros/${livroEditandoId}` : 'http://localhost:8000/livros/'
    const metodo = livroEditandoId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ titulo: tituloNovo, sinopse: sinopseNova, url_capa: capaFinal })
      })

      if (res.ok) {
        setTituloNovo('')
        setSinopseNova('')
        setArquivoCapa(null)
        setLivroEditandoId(null)
        setTelaLivroAberta(false)
        buscarLivros()
      } else {
        alert("A foto subiu, mas deu erro ao criar o livro! Código: " + res.status)
      }
    } catch (e) {
      alert("Erro fatal de conexão ao tentar salvar o livro: " + e.message)
    }
  }

  const deletarLivro = async (id) => { if (!window.confirm("Apagar livro?")) return; try { const res = await fetch(`http://localhost:8000/livros/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) buscarLivros(); } catch (e) { } }

  const iniciarEdicaoLivro = (livro) => {
    setTituloNovo(livro.titulo)
    setSinopseNova(livro.sinopse)
    setLivroEditandoId(livro.id)
    setTelaLivroAberta(true)
  }

  const abrirLivro = async (livro) => { setLivroSelecionado(livro); try { const res = await fetch(`http://localhost:8000/livros/${livro.id}/capitulos`); if (res.ok) setCapitulos(await res.json()); } catch (e) { } }
  const salvarCapitulo = async (e) => { e.preventDefault(); const url = capituloEditandoId ? `http://localhost:8000/capitulos/${capituloEditandoId}` : 'http://localhost:8000/capitulos/'; const metodo = capituloEditandoId ? 'PUT' : 'POST'; try { const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ livro_id: livroSelecionado.id, titulo_do_capitulo: tituloCapitulo, conteudo_texto: conteudoCapitulo, ordem_leitura: capituloEditandoId ? undefined : capitulos.length + 1 }) }); if (res.ok) { setTituloCapitulo(''); setConteudoCapitulo(''); setCapituloEditandoId(null); abrirLivro(livroSelecionado); } } catch (e) { } }
  const deletarCapitulo = async (id) => { if (!window.confirm("Apagar capítulo?")) return; try { const res = await fetch(`http://localhost:8000/capitulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) abrirLivro(livroSelecionado); } catch (e) { } }
  const iniciarEdicaoCapitulo = (cap) => { setTituloCapitulo(cap.titulo_do_capitulo); setConteudoCapitulo(cap.conteudo_texto); setCapituloEditandoId(cap.id); }

  // --- TELA 4: LEITURA E ESCRITA DE CAPÍTULOS ---
  if (token && livroSelecionado) {
    const souDonoDoLivro = livroSelecionado.autor_id === usuarioId
    return (
      <div className="min-h-screen bg-[#f6f3ff] text-[#1f1f1f] p-4 sm:p-8 font-['Poppins']">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setLivroSelecionado(null)} className="mb-6 text-[#7c3aed] hover:text-[#6d28d9] font-semibold flex items-center gap-2 transition-colors">
            ← Voltar para a Vitrine
          </button>

          <div className="bg-white rounded-[28px] p-6 sm:p-10 shadow-sm border border-purple-100 mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1f1f1f] mb-4">{livroSelecionado.titulo}</h1>
            <p className="text-[#6b7280] leading-relaxed">{livroSelecionado.sinopse}</p>
          </div>

          {souDonoDoLivro && (
            <div className="bg-[#f5f3ff] rounded-[24px] p-6 mb-8 border border-purple-200">
              <h3 className="text-lg font-bold text-[#2d1457] mb-4">{capituloEditandoId ? "✒️ Editar Capítulo" : "✒️ Escrever Novo Capítulo"}</h3>
              <form onSubmit={salvarCapitulo} className="flex flex-col gap-4">
                <input type="text" placeholder="Título do Capítulo" value={tituloCapitulo} onChange={(e) => setTituloCapitulo(e.target.value)} required className="p-4 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none w-full bg-white text-sm" />
                <textarea placeholder="Escreva sua história aqui..." value={conteudoCapitulo} onChange={(e) => setConteudoCapitulo(e.target.value)} required className="p-4 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none w-full h-48 resize-y bg-white text-sm" />
                <div className="flex gap-3">
                  <button type="submit" className="px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-[16px] shadow-md transition-colors text-sm">
                    {capituloEditandoId ? "Atualizar Capítulo" : "Publicar Capítulo"}
                  </button>
                  {capituloEditandoId && (
                    <button type="button" onClick={() => { setCapituloEditandoId(null); setTituloCapitulo(''); setConteudoCapitulo(''); }} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-semibold rounded-[16px] transition-colors text-sm">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          <h3 className="text-xl font-bold text-[#1f1f1f] mb-6">Índice de Capítulos</h3>
          <div className="space-y-4">
            {capitulos.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-[22px] text-center border border-gray-100">Nenhum capítulo publicado ainda.</p>
            ) : (
              capitulos.map((cap) => (
                <div key={cap.id} className="bg-white p-6 rounded-[22px] shadow-sm border-l-4 border-[#7c3aed] hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-gray-800">Capítulo {cap.ordem_leitura}: {cap.titulo_do_capitulo}</h4>
                    {souDonoDoLivro && (
                      <div className="flex gap-3 text-sm">
                        <button onClick={() => iniciarEdicaoCapitulo(cap)} className="text-[#7c3aed] hover:underline font-medium">Editar</button>
                        <button onClick={() => deletarCapitulo(cap.id)} className="text-red-500 hover:underline font-medium">Excluir</button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">{cap.conteudo_texto}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- TELA 3: FORMULÁRIO DEDICADO DO LIVRO (COM INPUT DE FILE!) ---
  if (token && telaLivroAberta) {
    return (
      <div className="min-h-screen bg-[#f6f3ff] text-[#1f1f1f] p-4 sm:p-8 font-['Poppins'] flex items-center justify-center">
        <div className="bg-white p-8 sm:p-10 rounded-[28px] shadow-xl w-full max-w-2xl border border-purple-50">
          <h2 className="text-2xl font-bold text-[#2d1457] mb-6">
            {livroEditandoId ? "✏️ Editar Obra" : "📚 Criar Nova Obra"}
          </h2>

          <form onSubmit={salvarLivro} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">TÍTULO DO LIVRO</label>
              <input type="text" placeholder="Ex: Ecos da Cidade" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} required className="w-full p-4 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none bg-[#fafafa] text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">SINOPSE DA HISTÓRIA</label>
              <textarea placeholder="Conte resumidamente sobre o que se trata seu livro..." value={sinopseNova} onChange={(e) => setSinopseNova(e.target.value)} required className="w-full p-4 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none bg-[#fafafa] text-sm h-32 resize-none" />
            </div>

            {/* CAMPO NOVO DE FAZER UPLOAD DA IMAGEM */}
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">IMAGEM DE CAPA</label>
              <div className="border-2 border-dashed border-purple-200 rounded-[16px] p-6 bg-[#fafafa] text-center hover:border-[#7c3aed] transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArquivoCapa(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="text-sm text-gray-600">
                  {arquivoCapa ? `📁 ${arquivoCapa.name}` : "✨ Clique aqui para escolher uma imagem do computador"}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="submit" className="flex-1 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-[16px] text-sm shadow-md transition-colors">
                {livroEditandoId ? "Atualizar Obra" : "Publicar Obra"}
              </button>
              <button type="button" onClick={() => { setTelaLivroAberta(false); setLivroEditandoId(null); setTituloNovo(''); setSinopseNova(''); setArquivoCapa(null); }} className="px-6 py-4 border border-gray-200 text-gray-500 font-semibold rounded-[16px] text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- TELA 2: VITRINE PRINCIPAL ---
  if (token && !livroSelecionado && !telaLivroAberta) {
    return (
      <div className="min-h-screen bg-[#f6f3ff] text-[#1f1f1f] pb-12 font-['Poppins']">
        <header className="bg-white shadow-sm px-4 sm:px-8 py-4 mb-8 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] rounded-[14px] flex items-center justify-center color-white text-xl shadow-md">✒️</div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Páginas</h1>
                <p className="text-xs text-[#777] hidden sm:block">Histórias de todos. Lidas por todos.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-[44px] h-[44px] rounded-full bg-[#ede9fe] hidden sm:block"></div>
              <button onClick={sair} className="px-4 py-2 border-2 border-[#7c3aed] text-[#7c3aed] hover:bg-[#f5f3ff] font-semibold rounded-[16px] text-sm transition-colors">
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#f1e8ff] to-[#ede9fe] rounded-[28px] p-8 sm:p-12 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2d1457] leading-tight mb-4">Escreva sem limites.</h2>
              <p className="text-[#6b7280] leading-relaxed text-sm sm:text-base">
                Um espaço onde escritores anônimos compartilham suas histórias e leitores descobrem novos mundos.
              </p>
            </div>
            <div className="w-full md:w-auto shrink-0">
              <button onClick={() => setTelaLivroAberta(true)} className="w-full md:w-auto px-6 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-[16px] text-sm shadow-lg shadow-purple-200 transition-colors">
                Começar a Escrever
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-[#1f1f1f]">Destaques do Acervo</h3>
            <span className="text-[#7c3aed] font-semibold text-sm hover:underline cursor-pointer">Ver todos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {livros.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center bg-white p-8 rounded-[22px]">A biblioteca está vazia por agora. Seja o primeiro a publicar!</p>
            ) : (
              livros.map((livro) => {
                const souDono = livro.autor_id === usuarioId;
                return (
                  <div key={livro.id} className="bg-white rounded-[22px] shadow-sm hover:shadow-xl border border-purple-50 overflow-hidden transition-all duration-300 flex flex-col">
                    <div className="h-[220px] relative p-4 flex items-end text-white font-bold text-lg">
                      <img src={livro.url_capa} alt="Capa" className="absolute inset-0 w-full h-full object-cover z-0" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10"></div>

                      <div className="absolute top-3.5 left-3.5 bg-[#8b5cf6] px-2.5 py-1 rounded-[10px] text-xs font-semibold z-20">
                        {souDono ? "Minha Obra" : "Disponível"}
                      </div>
                      <span className="line-clamp-2 relative z-20">{livro.titulo}</span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{livro.titulo}</h4>
                      <p className="text-xs text-gray-400 mb-3">Autor anónimo</p>
                      <p className="text-xs text-gray-500 mb-5 line-clamp-2 flex-1 leading-relaxed">{livro.sinopse}</p>

                      <button onClick={() => abrirLivro(livro)} className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-[16px] text-xs transition-colors mb-2">
                        Let / Escrever Capítulos
                      </button>

                      {souDono && (
                        <div className="flex justify-between border-t border-gray-50 pt-3 mt-2 text-xs">
                          <button onClick={() => iniciarEdicaoLivro(livro)} className="text-blue-500 hover:underline font-medium">Editar</button>
                          <button onClick={() => deletarLivro(livro.id)} className="text-red-500 hover:underline font-medium">Excluir</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#1f1f1f]">Categorias</h3>
            <span className="text-[#7c3aed] font-semibold text-sm hover:underline cursor-pointer">Ver todas</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { emoji: "💕", label: "Romance" },
              { emoji: "✨", label: "Fantasia" },
              { emoji: "👻", label: "Terror" },
              { emoji: "🕵️", label: "Mistério" },
              { emoji: "⚔️", label: "Aventura" },
              { emoji: "🎭", label: "Drama" },
            ].map((cat, idx) => (
              <div key={idx} className="bg-[#faf7ff] rounded-[22px] p-5 text-center border border-purple-50 hover:border-purple-200 transition-all cursor-pointer">
                <div className="text-2xl mb-2">{cat.emoji}</div>
                <span className="text-sm font-medium text-gray-800">{cat.label}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // --- TELA 1: AUTENTICAÇÃO ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f3ff] px-4 font-['Poppins']">
      <div className="bg-white p-8 sm:p-10 rounded-[28px] shadow-xl w-full max-w-md border border-purple-50">
        <div className="text-center mb-8">
          <div className="w-[50px] h-[50px] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] rounded-[16px] flex items-center justify-center color-white text-2xl mx-auto shadow-md mb-3">✒️</div>
          <h1 className="text-2xl font-bold text-[#1f1f1f] tracking-tight">Páginas</h1>
          <p className="text-gray-400 mt-1 text-xs">Histórias de todos. Lidas por todos.</p>
        </div>
        {/* O fluxo de login permanece idêntico ao anterior */}
        {etapaRecuperacao > 0 ? (
          <div>
            <h2 className="text-lg font-bold text-[#1f1f1f] mb-4 text-center">Recuperar Senha</h2>
            {etapaRecuperacao === 1 ? (
              <form onSubmit={pedirCodigo} className="flex flex-col gap-4">
                <input type="email" placeholder="O seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3.5 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none text-sm w-full bg-[#fafafa]" />
                <button type="submit" className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-[16px] text-sm shadow-md transition-colors">Enviar Código</button>
              </form>
            ) : (
              <form onSubmit={redefinirSenha} className="flex flex-col gap-4">
                <input type="text" placeholder="Código (6 dígitos)" value={codigoReset} onChange={(e) => setCodigoReset(e.target.value)} required className="p-3.5 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none text-center tracking-widest font-mono text-base bg-[#fafafa]" />
                <input type="password" placeholder="Nova Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="p-3.5 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none text-sm bg-[#fafafa]" />
                <button type="submit" className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-[16px] text-sm shadow-md transition-colors">Confirmar Nova Senha</button>
              </form>
            )}
            <button onClick={() => { setEtapaRecuperacao(0); setMensagem(''); }} className="w-full mt-5 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors text-center">← Voltar ao início</button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-5 text-center">{modoLogin ? "Acesse sua conta" : "Crie sua conta"}</h2>
            <form onSubmit={modoLogin ? fazerLogin : fazerCadastro} className="flex flex-col gap-4">
              <input type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3.5 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none text-sm bg-[#fafafa]" />
              <input type="password" placeholder="Sua Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="p-3.5 rounded-[16px] border border-gray-200 focus:ring-2 focus:ring-[#7c3aed] outline-none text-sm bg-[#fafafa]" />
              <button type="submit" className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-[16px] text-sm shadow-md transition-colors mt-1">
                {modoLogin ? "Entrar" : "Cadastrar"}
              </button>
            </form>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={() => { setModoLogin(!modoLogin); setMensagem(''); }} className="w-full py-3.5 border-2 border-gray-100 hover:bg-gray-50 text-gray-600 font-semibold rounded-[16px] text-xs transition-colors">
                {modoLogin ? "Não tem conta? Cadastre-se grátis" : "Já tem conta? Faça Login"}
              </button>
              {modoLogin && <button onClick={() => { setEtapaRecuperacao(1); setMensagem(''); }} className="text-xs text-[#7c3aed] hover:underline font-medium text-center mt-1">Esqueci minha senha</button>}
            </div>
          </div>
        )}
        {mensagem && <div className="mt-5 p-3.5 bg-purple-50 border-l-4 border-[#7c3aed] rounded-r-[12px] text-xs text-purple-950 font-medium">{mensagem}</div>}
      </div>
    </div>
  )
}

export default App