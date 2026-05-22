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
  const [livroEditandoId, setLivroEditandoId] = useState(null)

  const [livroSelecionado, setLivroSelecionado] = useState(null)
  const [capitulos, setCapitulos] = useState([])
  const [tituloCapitulo, setTituloCapitulo] = useState('')
  const [conteudoCapitulo, setConteudoCapitulo] = useState('')
  const [capituloEditandoId, setCapituloEditandoId] = useState(null)

  useEffect(() => {
    if (token && !livroSelecionado) buscarLivros()
  }, [token, livroSelecionado])

  // --- FUNÇÕES DE API (Lógica intacta) ---
  const pedirCodigo = async (e) => { e.preventDefault(); try { await fetch('http://localhost:8000/gerar-codigo-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) }); setEtapaRecuperacao(2); setMensagem('Verifique o terminal da API (logs) para ver o seu código.'); } catch (erro) { setMensagem('Erro de conexão.'); } }
  const redefinirSenha = async (e) => { e.preventDefault(); try { const resposta = await fetch('http://localhost:8000/resetar-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, codigo: codigoReset, nova_senha: senha }) }); if (resposta.ok) { setMensagem('Senha alterada! Faça seu login.'); setEtapaRecuperacao(0); setSenha(''); setCodigoReset(''); } else { setMensagem('Código inválido.'); } } catch (erro) { setMensagem('Erro de conexão.'); } }
  const fazerCadastro = async (e) => { e.preventDefault(); try { const resposta = await fetch('http://localhost:8000/usuarios/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, senha: senha }) }); if (resposta.ok) { setMensagem('Conta criada! Faça login.'); setModoLogin(true); setSenha(''); } else { setMensagem('Erro ao criar conta.'); } } catch (erro) { setMensagem('Erro de conexão.'); } }
  const fazerLogin = async (e) => { e.preventDefault(); const formData = new URLSearchParams(); formData.append('username', email); formData.append('password', senha); try { const resposta = await fetch('http://localhost:8000/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData }); if (resposta.ok) { const dados = await resposta.json(); localStorage.setItem('meu_token_jwt', dados.access_token); localStorage.setItem('meu_usuario_id', dados.usuario_id); setToken(dados.access_token); setUsuarioId(dados.usuario_id); setMensagem(''); } else { setMensagem('E-mail ou senha incorretos.'); } } catch (erro) { setMensagem('Erro de conexão.'); } }
  const sair = () => { localStorage.removeItem('meu_token_jwt'); localStorage.removeItem('meu_usuario_id'); setToken(''); setUsuarioId(null); setLivros([]); setLivroSelecionado(null); setMensagem(''); setEtapaRecuperacao(0); }
  const buscarLivros = async () => { try { const res = await fetch('http://localhost:8000/livros/'); if (res.ok) setLivros(await res.json()); } catch (e) { } }
  const salvarLivro = async (e) => { e.preventDefault(); const url = livroEditandoId ? `http://localhost:8000/livros/${livroEditandoId}` : 'http://localhost:8000/livros/'; const metodo = livroEditandoId ? 'PUT' : 'POST'; try { const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ titulo: tituloNovo, sinopse: sinopseNova, url_capa: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop" }) }); if (res.ok) { setTituloNovo(''); setSinopseNova(''); setLivroEditandoId(null); buscarLivros(); } } catch (e) { } }
  const deletarLivro = async (id) => { if (!window.confirm("Apagar livro?")) return; try { const res = await fetch(`http://localhost:8000/livros/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) buscarLivros(); } catch (e) { } }
  const iniciarEdicaoLivro = (livro) => { setTituloNovo(livro.titulo); setSinopseNova(livro.sinopse); setLivroEditandoId(livro.id); }
  const abrirLivro = async (livro) => { setLivroSelecionado(livro); try { const res = await fetch(`http://localhost:8000/livros/${livro.id}/capitulos`); if (res.ok) setCapitulos(await res.json()); } catch (e) { } }
  const salvarCapitulo = async (e) => { e.preventDefault(); const url = capituloEditandoId ? `http://localhost:8000/capitulos/${capituloEditandoId}` : 'http://localhost:8000/capitulos/'; const metodo = capituloEditandoId ? 'PUT' : 'POST'; try { const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ livro_id: livroSelecionado.id, titulo_do_capitulo: tituloCapitulo, conteudo_texto: conteudoCapitulo, ordem_leitura: capituloEditandoId ? undefined : capitulos.length + 1 }) }); if (res.ok) { setTituloCapitulo(''); setConteudoCapitulo(''); setCapituloEditandoId(null); abrirLivro(livroSelecionado); } } catch (e) { } }
  const deletarCapitulo = async (id) => { if (!window.confirm("Apagar capítulo?")) return; try { const res = await fetch(`http://localhost:8000/capitulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) abrirLivro(livroSelecionado); } catch (e) { } }
  const iniciarEdicaoCapitulo = (cap) => { setTituloCapitulo(cap.titulo_do_capitulo); setConteudoCapitulo(cap.conteudo_texto); setCapituloEditandoId(cap.id); }

  // ==========================================
  // TELA 3: PAINEL DE LEITURA
  // ==========================================
  if (token && livroSelecionado) {
    const souDonoDoLivro = livroSelecionado.autor_id === usuarioId
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setLivroSelecionado(null)} className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-2 transition-colors">
            ← Voltar para a Vitrine
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{livroSelecionado.titulo}</h1>
            <p className="text-lg text-gray-600 leading-relaxed">{livroSelecionado.sinopse}</p>
          </div>

          {souDonoDoLivro && (
            <div className="bg-indigo-50 rounded-2xl p-6 mb-8 border border-indigo-100 shadow-inner">
              <h3 className="text-xl font-bold text-indigo-900 mb-4">{capituloEditandoId ? "✏️ Editar Capítulo" : "✨ Escrever Novo Capítulo"}</h3>
              <form onSubmit={salvarCapitulo} className="flex flex-col gap-4">
                <input type="text" placeholder="Título do Capítulo" value={tituloCapitulo} onChange={(e) => setTituloCapitulo(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                <textarea placeholder="Escreva sua história aqui..." value={conteudoCapitulo} onChange={(e) => setConteudoCapitulo(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none w-full h-40 resize-y" />
                <div className="flex gap-3 mt-2">
                  <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors">
                    {capituloEditandoId ? "Atualizar Capítulo" : "Publicar Capítulo"}
                  </button>
                  {capituloEditandoId && (
                    <button type="button" onClick={() => { setCapituloEditandoId(null); setTituloCapitulo(''); setConteudoCapitulo(''); }} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          <h3 className="text-2xl font-bold text-gray-900 mb-6">Índice de Capítulos</h3>
          <div className="space-y-6">
            {capitulos.length === 0 ? (
              <p className="text-gray-500 italic bg-white p-6 rounded-xl border border-gray-100">Nenhum capítulo escrito ainda. Comece sua obra-prima!</p>
            ) : (
              capitulos.map((cap) => (
                <div key={cap.id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-bold text-gray-800">Capítulo {cap.ordem_leitura}: {cap.titulo_do_capitulo}</h4>
                    {souDonoDoLivro && (
                      <div className="flex gap-3">
                        <button onClick={() => iniciarEdicaoCapitulo(cap)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Editar</button>
                        <button onClick={() => deletarCapitulo(cap.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Excluir</button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{cap.conteudo_texto}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // TELA 2: VITRINE PRINCIPAL
  // ==========================================
  if (token && !livroSelecionado) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Navbar */}
        <nav className="bg-white shadow-sm px-8 py-4 mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight">Plataforma<span className="text-gray-800">Livros</span></h1>
          <button onClick={sair} className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg transition-colors">
            Sair da conta
          </button>
        </nav>

        <div className="max-w-7xl mx-auto px-6">
          {/* Painel de Criação */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{livroEditandoId ? "✏️ Editar Informações do Livro" : "📚 Adicionar Novo Livro"}</h3>
            <form onSubmit={salvarLivro} className="flex flex-col md:flex-row gap-4">
              <input type="text" placeholder="Título do Livro" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} required className="flex-1 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="text" placeholder="Sinopse rápida" value={sinopseNova} onChange={(e) => setSinopseNova(e.target.value)} required className="flex-[2] p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <div className="flex gap-2">
                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors w-full md:w-auto">
                  {livroEditandoId ? "Atualizar" : "Salvar Livro"}
                </button>
                {livroEditandoId && (
                  <button type="button" onClick={() => { setLivroEditandoId(null); setTituloNovo(''); setSinopseNova(''); }} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Grid de Livros */}
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Meu Acervo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pb-10">
            {livros.length === 0 ? (
              <p className="text-gray-500 col-span-full">Nenhum livro cadastrado. A biblioteca está vazia!</p>
            ) : (
              livros.map((livro) => {
                const souDono = livro.autor_id === usuarioId;
                return (
                  <div key={livro.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                    <div className="h-48 overflow-hidden bg-gray-200">
                      <img src={livro.url_capa} alt="Capa" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{livro.titulo}</h4>
                      <p className="text-sm text-gray-600 mb-6 line-clamp-2 flex-1">{livro.sinopse}</p>

                      <button onClick={() => abrirLivro(livro)} className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors mb-3">
                        Ler Capítulos
                      </button>

                      {souDono && (
                        <div className="flex justify-between border-t border-gray-100 pt-3 mt-auto">
                          <button onClick={() => iniciarEdicaoLivro(livro)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Editar</button>
                          <button onClick={() => deletarLivro(livro.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Excluir</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // TELA 1: LOGIN / CADASTRO / RECUPERAÇÃO
  // ==========================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">

        {/* LOGO SIMULADO */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">Plataforma<span className="text-gray-800">Livros</span></h1>
          <p className="text-gray-500 mt-2 text-sm">Onde suas histórias ganham vida.</p>
        </div>

        {etapaRecuperacao > 0 ? (
          // --- FLUXO DE RECUPERAÇÃO ---
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Recuperar Senha</h2>
            {etapaRecuperacao === 1 ? (
              <form onSubmit={pedirCodigo} className="flex flex-col gap-5">
                <p className="text-sm text-gray-600 text-center">Digite seu e-mail para receber o código de segurança.</p>
                <input type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors">Enviar Código</button>
              </form>
            ) : (
              <form onSubmit={redefinirSenha} className="flex flex-col gap-5">
                <p className="text-sm text-indigo-600 bg-indigo-50 p-3 rounded-lg text-center font-medium border border-indigo-100">Um código foi gerado nos logs da API.</p>
                <input type="text" placeholder="Código de 6 dígitos" value={codigoReset} onChange={(e) => setCodigoReset(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest text-lg font-mono" />
                <input type="password" placeholder="Sua Nova Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors">Salvar Nova Senha</button>
              </form>
            )}
            <button onClick={() => { setEtapaRecuperacao(0); setMensagem(''); }} className="w-full mt-6 py-2 text-gray-500 hover:text-gray-800 font-medium transition-colors">
              ← Voltar para o Login
            </button>
          </div>

        ) : (
          // --- FLUXO NORMAL (LOGIN/CADASTRO) ---
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{modoLogin ? "Acesse sua conta" : "Crie sua conta"}</h2>
            <form onSubmit={modoLogin ? fazerLogin : fazerCadastro} className="flex flex-col gap-5">
              <input type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <input type="password" placeholder="Sua Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <button type="submit" className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-lg shadow-md transition-colors mt-2">
                {modoLogin ? "Entrar" : "Cadastrar"}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-3">
              <button onClick={() => { setModoLogin(!modoLogin); setMensagem(''); }} className="w-full py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors">
                {modoLogin ? "Não tem conta? Cadastre-se grátis" : "Já tem conta? Faça Login"}
              </button>
              {modoLogin && (
                <button onClick={() => { setEtapaRecuperacao(1); setMensagem(''); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mt-2">
                  Esqueci minha senha
                </button>
              )}
            </div>
          </div>
        )}

        {/* MENSAGEM DE ALERTA/ERRO */}
        {mensagem && (
          <div className="mt-6 p-4 bg-gray-50 border-l-4 border-indigo-500 rounded-r-lg text-sm text-gray-700 font-medium animate-fade-in">
            {mensagem}
          </div>
        )}
      </div>
    </div>
  )
}

export default App