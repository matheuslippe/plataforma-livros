import { useState, useEffect } from 'react'

function App() {
  // --- Estados do Usuário ---
  const [token, setToken] = useState(localStorage.getItem('meu_token_jwt') || '')
  const [usuarioId, setUsuarioId] = useState(Number(localStorage.getItem('meu_usuario_id')) || null)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [modoLogin, setModoLogin] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [username, setUsername] = useState('')
  const [nomePerfil, setNomePerfil] = useState('')

  // --- Estados do Livro ---
  const [livros, setLivros] = useState([])
  const [tituloNovo, setTituloNovo] = useState('')
  const [sinopseNova, setSinopseNova] = useState('')
  const [arquivoCapa, setArquivoCapa] = useState(null)
  const [idioma, setIdioma] = useState('Português')
  const [tipoHistoria, setTipoHistoria] = useState('Ficção')
  const [tags, setTags] = useState('')
  const [direitosAutorais, setDireitosAutorais] = useState('Todos os Direitos Reservados')
  const [classificacaoAdulto, setClassificacaoAdulto] = useState(false)
  const [personagensPrincipais, setPersonagensPrincipais] = useState('')
  const [publicoAlvo, setPublicoAlvo] = useState('Jovem Adulto (13-18 anos)')

  // --- Estados de Navegação ---
  const [abaAtual, setAbaAtual] = useState('inicio')
  const [telaLivroAberta, setTelaLivroAberta] = useState(false)
  const [livroEditandoId, setLivroEditandoId] = useState(null)
  const [livroSelecionado, setLivroSelecionado] = useState(null)

  // --- Estados de Capítulos ---
  const [capitulos, setCapitulos] = useState([])
  const [tituloCapitulo, setTituloCapitulo] = useState('')
  const [conteudoCapitulo, setConteudoCapitulo] = useState('')
  const [capituloEditandoId, setCapituloEditandoId] = useState(null)
  const [capituloLendo, setCapituloLendo] = useState(null)

  // Carrega os livros na inicialização
  useEffect(() => {
    if (!livroSelecionado) buscarLivros()
  }, [livroSelecionado])

  const exigirLogin = (acao_permitida) => {
    if (token) acao_permitida()
    else setMostrarLogin(true)
  }

  // ==========================================
  // LÓGICA DE API - USUÁRIOS E LOGIN
  // ==========================================
  const fazerCadastro = async (e) => {
    e.preventDefault();
    try {
      const resposta = await fetch('http://localhost:8000/usuarios/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, nome_perfil: nomePerfil, email, senha })
      });
      if (resposta.ok) {
        setMensagem('Conta criada com sucesso! Faça login.');
        setModoLogin(true);
        setSenha('');
      } else {
        const erroData = await resposta.json();
        setMensagem(erroData.detail || 'Erro ao cadastrar.');
      }
    } catch (erro) { setMensagem('Erro de conexão.'); }
  }

  const fazerLogin = async (e) => {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', senha);
    try {
      const resposta = await fetch('http://localhost:8000/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
      if (resposta.ok) {
        const dados = await resposta.json();
        localStorage.setItem('meu_token_jwt', dados.access_token);
        localStorage.setItem('meu_usuario_id', dados.usuario_id);
        setToken(dados.access_token);
        setUsuarioId(dados.usuario_id);
        setMensagem('');
        setMostrarLogin(false);
      } else { setMensagem('E-mail ou senha incorretos.'); }
    } catch (erro) { setMensagem('Erro de conexão.'); }
  }

  const sair = () => { localStorage.removeItem('meu_token_jwt'); localStorage.removeItem('meu_usuario_id'); setToken(''); setUsuarioId(null); setLivros([]); setLivroSelecionado(null); setMensagem(''); setTelaLivroAberta(false); setAbaAtual('inicio'); buscarLivros(); }

  // ==========================================
  // LÓGICA DE API - LIVROS E CAPÍTULOS
  // ==========================================
  const buscarLivros = async () => { try { const res = await fetch('http://localhost:8000/livros/'); if (res.ok) setLivros(await res.json()); } catch (e) { } }

  const salvarLivro = async (e) => {
    e.preventDefault()
    let capaFinal = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"

    if (arquivoCapa) {
      const formData = new FormData(); formData.append('file', arquivoCapa)
      try {
        const resUpload = await fetch('http://localhost:8000/upload-capa', { method: 'POST', body: formData })
        if (resUpload.ok) { const dadosUpload = await resUpload.json(); capaFinal = dadosUpload.url_capa; }
        else { alert("Erro ao subir imagem."); return; }
      } catch (erro) { alert("Erro de conexão."); return; }
    } else if (livroEditandoId) {
      const livroAntigo = livros.find(l => l.id === livroEditandoId)
      if (livroAntigo) capaFinal = livroAntigo.url_capa
    }

    const url = livroEditandoId ? `http://localhost:8000/livros/${livroEditandoId}` : 'http://localhost:8000/livros/'
    const metodo = livroEditandoId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ titulo: tituloNovo, sinopse: sinopseNova, url_capa: capaFinal, idioma, tipo_historia: tipoHistoria, tags, direitos_autorais: direitosAutorais, classificacao_adulto: classificacaoAdulto, personagens_principais: personagensPrincipais, publico_alvo: publicoAlvo })
      })
      if (res.ok) {
        setTituloNovo(''); setSinopseNova(''); setArquivoCapa(null); setIdioma('Português'); setTipoHistoria('Ficção'); setTags(''); setDireitosAutorais('Todos os Direitos Reservados'); setClassificacaoAdulto(false); setPersonagensPrincipais(''); setPublicoAlvo('Jovem Adulto (13-18 anos)');
        setLivroEditandoId(null); setTelaLivroAberta(false); buscarLivros();
      }
    } catch (e) { }
  }

  const deletarLivro = async (id) => { if (!window.confirm("Apagar?")) return; try { const res = await fetch(`http://localhost:8000/livros/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) buscarLivros(); } catch (e) { } }

  const iniciarEdicaoLivro = (livro) => {
    setTituloNovo(livro.titulo); setSinopseNova(livro.sinopse); setIdioma(livro.idioma || 'Português'); setTipoHistoria(livro.tipo_historia || 'Ficção'); setTags(livro.tags || ''); setDireitosAutorais(livro.direitos_autorais || 'Todos os Direitos Reservados'); setClassificacaoAdulto(livro.classificacao_adulto || false); setPersonagensPrincipais(livro.personagens_principais || ''); setPublicoAlvo(livro.publico_alvo || 'Jovem Adulto (13-18 anos)'); setLivroEditandoId(livro.id); setTelaLivroAberta(true);
  }

  const abrirLivro = async (livro) => {
    setLivroSelecionado(livro);
    setCapituloLendo(null);
    try { const res = await fetch(`http://localhost:8000/livros/${livro.id}/capitulos`); if (res.ok) setCapitulos(await res.json()); } catch (e) { }
  }

  const salvarCapitulo = async (e) => { e.preventDefault(); const url = capituloEditandoId ? `http://localhost:8000/capitulos/${capituloEditandoId}` : 'http://localhost:8000/capitulos/'; const metodo = capituloEditandoId ? 'PUT' : 'POST'; try { const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ livro_id: livroSelecionado.id, titulo_do_capitulo: tituloCapitulo, conteudo_texto: conteudoCapitulo, ordem_leitura: capituloEditandoId ? undefined : capitulos.length + 1 }) }); if (res.ok) { setTituloCapitulo(''); setConteudoCapitulo(''); setCapituloEditandoId(null); abrirLivro(livroSelecionado); } } catch (e) { } }

  const deletarCapitulo = async (id) => { if (!window.confirm("Apagar?")) return; try { const res = await fetch(`http://localhost:8000/capitulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) abrirLivro(livroSelecionado); } catch (e) { } }

  const iniciarEdicaoCapitulo = (cap) => { setTituloCapitulo(cap.titulo_do_capitulo); setConteudoCapitulo(cap.conteudo_texto); setCapituloEditandoId(cap.id); }

  // ==========================================
  // LÓGICA DO MOTOR SOCIAL (CAPÍTULOS)
  // ==========================================
  const iniciarLeituraCapitulo = async (cap) => {
    setCapituloLendo(cap);
    try {
      await fetch(`http://localhost:8000/capitulos/${cap.id}/visualizar`, { method: 'POST' });
      buscarLivros();
      const res = await fetch(`http://localhost:8000/livros/${livroSelecionado.id}/capitulos`);
      if (res.ok) {
        const capsAts = await res.json();
        setCapitulos(capsAts);
        const capAts = capsAts.find(c => c.id === cap.id);
        if (capAts) setCapituloLendo(capAts);
      }
    } catch (e) { }
  }

  const curtirCapitulo = async (capId) => {
    if (!token) { setMostrarLogin(true); return; }
    try {
      const res = await fetch(`http://localhost:8000/capitulos/${capId}/curtir`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();
        if (capituloLendo && capituloLendo.id === capId) {
          setCapituloLendo({ ...capituloLendo, curtidas_totales: dados.curtidas_totales });
        }
        setCapitulos(capitulos.map(c => c.id === capId ? { ...c, curtidas_totales: dados.curtidas_totales } : c));
        buscarLivros();
      }
    } catch (e) { }
  }

  const livrosRecentes = [...livros].reverse();

  // ==========================================
  // 1. TELA DE LOGIN 
  // ==========================================
  if (mostrarLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7fb] px-4 font-sans relative">
        <button onClick={() => setMostrarLogin(false)} className="absolute top-6 left-6 text-gray-500 font-bold flex items-center gap-2 hover:text-gray-800">
          ← Voltar
        </button>
        <div className="bg-white p-8 rounded-3xl w-full max-w-md border border-gray-100 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#5a31f4]">Páginas</h1>
          {mensagem && <p className="text-center text-red-500 text-sm mb-4">{mensagem}</p>}
          <form onSubmit={modoLogin ? fazerLogin : fazerCadastro} className="flex flex-col gap-4">
            {!modoLogin && (
              <>
                <input type="text" placeholder="Seu nome de exibição (Ex: João Silva)" value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} required className="p-4 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#5a31f4]" />
                <input type="text" placeholder="Escolha um @ (Ex: joaosilva123)" value={username} onChange={(e) => setUsername(e.target.value)} required className="p-4 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#5a31f4]" />
              </>
            )}
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-4 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#5a31f4]" />
            <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="p-4 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#5a31f4]" />
            <button type="submit" className="w-full py-4 bg-[#5a31f4] text-white font-bold rounded-xl hover:bg-[#4924c9] transition-colors">{modoLogin ? "Entrar" : "Criar Conta"}</button>
            <button type="button" onClick={() => { setModoLogin(!modoLogin); setMensagem(''); }} className="text-xs text-gray-500 mt-2 hover:underline">{modoLogin ? "Criar nova conta" : "Já tenho conta"}</button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // 2. TELA DE LEITURA / CAPÍTULOS
  // ==========================================
  if (livroSelecionado) {
    const souDonoDoLivro = token && livroSelecionado.autor_id === usuarioId
    // Pega os totais atualizados em tempo real se existirem no state de livros principal
    const livroAtualizado = livros.find(l => l.id === livroSelecionado.id) || livroSelecionado;

    return (
      <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-8 font-sans pb-24">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setLivroSelecionado(null)} className="mb-6 text-[#5a31f4] hover:underline font-semibold flex items-center gap-2">
            ← Voltar para Vitrine
          </button>

          <div className="mb-8 flex flex-col md:flex-row gap-6 items-start">
            <img src={livroSelecionado.url_capa} className="w-32 h-48 object-cover rounded-2xl shadow-md" alt="Capa" />
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{livroSelecionado.titulo}</h1>
              <p className="text-sm text-gray-500 mb-4 font-medium">Por @{livroSelecionado.autor?.username?.replace('@', '') || 'autor'}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{livroSelecionado.idioma}</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{livroSelecionado.tipo_historia}</span>
                {livroSelecionado.classificacao_adulto && <span className="px-2 py-1 bg-red-100 text-red-600 font-bold text-xs rounded-md">+18</span>}
              </div>

              <div className="flex items-center gap-4 mb-4">
                <span className="text-gray-500 text-sm font-medium flex items-center gap-1">👁 {livroAtualizado.visualizacoes || 0} Visitas Totais</span>
                <span className="text-gray-500 text-sm font-medium flex items-center gap-1">♡ {livroAtualizado.curtidas_totales || 0} Curtidas Totais</span>
              </div>

              <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{livroSelecionado.sinopse}</p>
            </div>

            {souDonoDoLivro && (
              <div className="flex flex-col gap-2">
                <button onClick={() => iniciarEdicaoLivro(livroSelecionado)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200">Editar Detalhes</button>
                <button onClick={() => deletarLivro(livroSelecionado.id)} className="px-4 py-2 bg-red-50 text-red-500 font-bold rounded-xl text-sm hover:bg-red-100">Excluir Obra</button>
              </div>
            )}
          </div>

          {souDonoDoLivro && !capituloLendo && (
            <div className="bg-[#f8f7fb] rounded-2xl p-6 mb-8 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{capituloEditandoId ? "Editar Capítulo" : "Escrever Novo Capítulo"}</h3>
              <form onSubmit={salvarCapitulo} className="flex flex-col gap-4">
                <input type="text" placeholder="Título do Capítulo" value={tituloCapitulo} onChange={(e) => setTituloCapitulo(e.target.value)} required className="p-4 rounded-xl bg-white border border-gray-100 focus:ring-2 focus:ring-[#5a31f4] outline-none w-full" />
                <textarea placeholder="Escreva sua história aqui..." value={conteudoCapitulo} onChange={(e) => setConteudoCapitulo(e.target.value)} required className="p-4 rounded-xl bg-white border border-gray-100 focus:ring-2 focus:ring-[#5a31f4] outline-none w-full h-48 resize-y" />
                <div className="flex gap-3">
                  <button type="submit" className="px-6 py-3 bg-[#5a31f4] text-white font-semibold rounded-xl text-sm hover:bg-[#4924c9]">{capituloEditandoId ? "Atualizar" : "Publicar"}</button>
                  {capituloEditandoId && (
                    <button type="button" onClick={() => { setCapituloEditandoId(null); setTituloCapitulo(''); setConteudoCapitulo(''); }} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-300">Cancelar</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {capituloLendo ? (
            <div className="bg-[#f8f7fb] p-6 sm:p-10 rounded-3xl mt-8 shadow-inner border border-gray-100">
              <button onClick={() => setCapituloLendo(null)} className="mb-8 text-gray-500 font-bold hover:text-[#5a31f4] flex items-center gap-2 transition-colors">
                ← Voltar para o Índice
              </button>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{capituloLendo.titulo_do_capitulo}</h2>

              <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-500 font-medium">👁 {capituloLendo.visualizacoes} Leituras</p>
                <button onClick={() => curtirCapitulo(capituloLendo.id)} className="flex items-center gap-1 text-sm font-bold text-rose-500 hover:bg-rose-100 transition-colors bg-rose-50 px-4 py-2 rounded-xl shadow-sm">
                  ♡ {capituloLendo.curtidas_totales || 0} Curtir Capítulo
                </button>
              </div>

              <div className="prose max-w-none text-gray-800 leading-loose whitespace-pre-wrap font-serif text-lg md:text-xl">
                {capituloLendo.conteudo_texto}
              </div>

              <button onClick={() => setCapituloLendo(null)} className="mt-16 w-full py-5 bg-gray-200 text-gray-800 font-bold rounded-2xl hover:bg-gray-300 transition-colors">
                Terminei este capítulo
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-6 mt-8">Índice de Capítulos</h3>
              <div className="space-y-3">
                {capitulos.length === 0 ? (
                  <p className="text-gray-500 py-8 bg-gray-50 text-center rounded-2xl border border-dashed border-gray-200">Nenhum capítulo publicado ainda.</p>
                ) : (
                  capitulos.map((cap) => (
                    <div key={cap.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#5a31f4] transition-colors cursor-pointer group" onClick={() => iniciarLeituraCapitulo(cap)}>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg group-hover:text-[#5a31f4] transition-colors">Capítulo {cap.ordem_leitura}: {cap.titulo_do_capitulo}</h4>
                        <div className="flex gap-4 mt-1">
                          <p className="text-xs text-gray-400 font-medium">👁 {cap.visualizacoes} Leituras</p>
                          <p className="text-xs text-rose-400 font-medium">♡ {cap.curtidas_totales} Curtidas</p>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => iniciarLeituraCapitulo(cap)} className="flex-1 sm:flex-none px-6 py-2.5 bg-[#f3efff] text-[#5a31f4] font-bold rounded-xl text-sm hover:bg-[#e9e2ff] transition-colors">Ler</button>
                        {souDonoDoLivro && (
                          <>
                            <button onClick={() => iniciarEdicaoCapitulo(cap)} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200">Editar</button>
                            <button onClick={() => deletarCapitulo(cap.id)} className="px-4 py-2.5 bg-red-50 text-red-500 font-bold rounded-xl text-sm hover:bg-red-100">Excluir</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ==========================================
  // 3. TELA DE CRIAÇÃO / EDIÇÃO DE OBRA
  // ==========================================
  if (telaLivroAberta) {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-6 font-sans flex flex-col pt-8 pb-24">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#5a31f4]">{livroEditandoId ? "Editar Detalhes da Obra" : "Nova Obra"}</h2>

        <form onSubmit={salvarLivro} className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          <input type="text" placeholder="Título da Obra" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} required className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-[#5a31f4]" />
          <textarea placeholder="Sinopse (Resuma sua história para atrair leitores...)" value={sinopseNova} onChange={(e) => setSinopseNova(e.target.value)} required className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none h-32 focus:ring-2 focus:ring-[#5a31f4]" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none cursor-pointer focus:ring-2 focus:ring-[#5a31f4]">
              <option value="Português">Português</option><option value="Inglês">Inglês</option><option value="Espanhol">Espanhol</option>
            </select>
            <select value={tipoHistoria} onChange={(e) => setTipoHistoria(e.target.value)} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none cursor-pointer focus:ring-2 focus:ring-[#5a31f4]">
              <option value="Ficção">Ficção</option><option value="Fanfic">Fanfic</option><option value="Não ficção">Não ficção</option><option value="Poesia">Poesia</option>
            </select>
          </div>

          <input type="text" placeholder="Tags (Ex: romance, magia). Separe por vírgulas." value={tags} onChange={(e) => setTags(e.target.value)} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-[#5a31f4]" />
          <input type="text" placeholder="Personagens Principais (Ex: Harry, Hermione)" value={personagensPrincipais} onChange={(e) => setPersonagensPrincipais(e.target.value)} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-[#5a31f4]" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={publicoAlvo} onChange={(e) => setPublicoAlvo(e.target.value)} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none cursor-pointer text-sm focus:ring-2 focus:ring-[#5a31f4]">
              <option value="Infantil (0-12 anos)">Infantil (0-12 anos)</option><option value="Jovem Adulto (13-18 anos)">Jovem Adulto (13-18 anos)</option><option value="Novo Adulto (18-25 anos)">Novo Adulto (18-25 anos)</option><option value="Adulto (25+ anos)">Adulto (25+ anos)</option>
            </select>
            <select value={direitosAutorais} onChange={(e) => setDireitosAutorais(e.target.value)} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none cursor-pointer text-sm focus:ring-2 focus:ring-[#5a31f4]">
              <option value="Todos os Direitos Reservados">Todos os Direitos Reservados</option><option value="Domínio Público">Domínio Público</option><option value="Creative Commons (CC) Atribuição">Creative Commons (CC) Atribuição</option><option value="(CC) Atribuição-NãoComercial">(CC) Atribuição-NãoComercial</option><option value="(CC) Atribuição-NãoComercial-SemDerivações">(CC) Atribuição-NãoComercial-SemDerivações</option><option value="(CC) Atribuição-NãoComercial-CompartilhaIgual">(CC) Atribuição-NãoComercial-CompartilhaIgual</option><option value="(CC) Atribuição-CompartilhaIgual">(CC) Atribuição-CompartilhaIgual</option><option value="(CC) Atribuição-SemDerivações">(CC) Atribuição-SemDerivações</option>
            </select>
          </div>

          <label className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-colors">
            <input type="checkbox" checked={classificacaoAdulto} onChange={(e) => setClassificacaoAdulto(e.target.checked)} className="w-5 h-5 accent-red-500 cursor-pointer" />
            <span className="text-sm font-bold text-red-600">Conteúdo +18 (História contém cenas explícitas ou gatilhos fortes)</span>
          </label>

          <div className="border-2 border-dashed border-gray-300 hover:border-[#5a31f4] transition-colors rounded-2xl p-6 bg-gray-50 text-center relative mt-2">
            <input type="file" accept="image/*" onChange={(e) => setArquivoCapa(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <span className="text-sm text-gray-600 font-medium">{arquivoCapa ? arquivoCapa.name : "🖼️ Toque aqui para enviar a Capa do Livro"}</span>
          </div>

          <div className="flex gap-4 mt-4">
            <button type="button" onClick={() => { setTelaLivroAberta(false); setLivroEditandoId(null); }} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-full hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-4 bg-[#5a31f4] text-white font-bold rounded-full shadow-md hover:bg-[#4924c9] transition-colors">Salvar Obra</button>
          </div>
        </form>
      </div>
    )
  }

  // ==========================================
  // 4. VITRINE (PÚBLICA PARA TODOS)
  // ==========================================
  return (
    <div className="min-h-screen bg-white text-gray-900 pb-28 font-sans">
      <header className="px-4 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#5a31f4] rounded-[10px] flex items-center justify-center text-white text-sm shadow-md">✒️</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Páginas</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
          <div onClick={() => exigirLogin(() => setAbaAtual('perfil'))} className="w-9 h-9 rounded-full bg-[#f3efff] border border-[#dcd1f3] flex items-center justify-center text-sm cursor-pointer hover:bg-[#e9e2ff] transition-colors">
            👤
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {abaAtual === 'inicio' && (
          <>
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
              <input type="text" placeholder="Buscar histórias, autores ou gêneros..." className="w-full pl-11 pr-4 py-3 bg-[#f8f7fb] border border-gray-100 rounded-2xl text-sm focus:outline-none" />
            </div>

            <div className="bg-[#f2effb] rounded-3xl p-6 mb-8 flex items-center justify-between relative overflow-hidden h-[200px]">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
              <div className="absolute right-[-20%] top-[-10%] w-[150%] h-[150%] bg-gradient-to-l from-white/40 to-transparent rounded-full pointer-events-none"></div>
              <div className="relative z-10 max-w-[65%]">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a1a] leading-snug mb-2 font-serif">Escreva sem limites.<br />Leia sem fronteiras.</h2>
                <p className="text-[#555] text-[11px] sm:text-xs mb-4 leading-relaxed">Um espaço feito para histórias<br />de autores e leitores curiosos.</p>
                <button onClick={() => exigirLogin(() => setTelaLivroAberta(true))} className="px-4 py-2.5 bg-[#5a31f4] text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-sm hover:bg-[#4924c9] transition-colors">
                  ✒️ Enviar minha obra
                </button>
              </div>
              <div className="absolute right-0 bottom-0 w-32 h-32 opacity-80 pointer-events-none"><svg viewBox="0 0 100 100" className="w-full h-full fill-[#1a1a24]"><path d="M70,90 C60,85 55,70 50,60 C48,55 45,50 40,55 C35,60 30,70 25,80 C20,90 10,100 0,100 L100,100 L100,90 Z" /></svg></div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2"><span className="text-[#5a31f4] text-lg">★</span><h3 className="text-lg font-bold text-gray-900">Destaques</h3></div>
              <span className="text-[#5a31f4] text-xs hover:underline cursor-pointer">Ver todos &gt;</span>
            </div>

            <div className="flex overflow-x-auto pb-6 gap-4 snap-x hide-scrollbar">
              {livros.map((livro) => (
                <div key={livro.id} className="min-w-[140px] max-w-[140px] h-[200px] rounded-[16px] overflow-hidden relative group cursor-pointer flex-shrink-0" onClick={() => abrirLivro(livro)}>
                  <img src={livro.url_capa} className="absolute inset-0 w-full h-full object-cover z-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
                  {livro.classificacao_adulto && <div className="absolute top-2 right-2 bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold z-20">+18</div>}
                  <div className="absolute top-2 left-2 bg-[#5a31f4] text-white px-2 py-0.5 rounded text-[9px] font-bold z-20">{livro.tipo_historia}</div>
                  <div className="absolute bottom-2 left-2 right-2 z-20">
                    <h4 className="font-bold text-white text-xs mb-0.5 line-clamp-2">{livro.titulo}</h4>
                    <p className="text-[9px] text-gray-300 mb-1">@{livro.autor?.username?.replace('@', '') || 'autor'}</p>
                    <div className="flex gap-2 text-[9px] text-gray-300">
                      <span>👁 {livro.visualizacoes || 0}</span><span>♡ {livro.curtidas_totales || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#f8f7fb] border border-gray-100 rounded-2xl p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#5a31f4] rounded-full flex items-center justify-center text-white text-lg">✒️</div>
                <div><h4 className="font-bold text-[#5a31f4] text-sm">Tem uma história para contar?</h4><p className="text-[11px] text-gray-500">Publique sua obra agora mesmo.</p></div>
              </div>
              <button onClick={() => exigirLogin(() => setTelaLivroAberta(true))} className="px-3 py-1.5 bg-white border border-gray-200 text-[#5a31f4] font-bold rounded-lg text-xs shadow-sm hover:bg-gray-50 transition-colors">Publicar obra</button>
            </div>

            <div className="flex justify-between items-center mb-4 mt-2">
              <div className="flex items-center gap-2"><h3 className="text-lg font-bold text-gray-900">🔥 Novidades</h3><span className="bg-[#f3efff] text-[#5a31f4] text-[9px] font-bold px-1.5 py-0.5 rounded">Novo</span></div>
              <span className="text-[#5a31f4] text-xs hover:underline cursor-pointer">Ver todas &gt;</span>
            </div>

            <div className="space-y-3 mb-8">
              {livrosRecentes.slice(0, 5).map((livro) => (
                <div key={livro.id} className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-[#dcd1f3] transition-colors" onClick={() => abrirLivro(livro)}>
                  <img src={livro.url_capa} className="w-20 h-28 object-cover rounded-xl" />
                  <div className="flex-1 py-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between">
                        <h4 className="font-bold text-sm line-clamp-1 pr-2">{livro.titulo}</h4>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">👁 {livro.visualizacoes || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1">@{livro.autor?.username?.replace('@', '') || 'autor'}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-2">{livro.sinopse}</p>
                    </div>
                    <button className="bg-[#f8f7fb] text-[#5a31f4] px-3 py-1.5 rounded-lg text-[10px] font-bold w-full text-left mt-1 hover:bg-[#e9e2ff] transition-colors">▶ Continuar lendo</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {abaAtual === 'explorar' && <h2 className="text-xl font-bold pt-4">Explorar (Em breve)</h2>}
        {abaAtual === 'biblioteca' && <h2 className="text-xl font-bold pt-4">Sua Estante (Em breve)</h2>}
        {abaAtual === 'perfil' && (
          <div className="pt-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">Configurações</h2>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-[#f3efff] text-[#5a31f4] rounded-full flex items-center justify-center text-3xl mb-4 border-2 border-[#dcd1f3]">👤</div>
              <p className="text-gray-600 mb-6 text-center text-sm">Você está conectado. Futuramente, aqui ficarão suas configurações de perfil.</p>
              <button onClick={sair} className="px-6 py-4 bg-red-50 text-red-500 font-bold rounded-xl w-full hover:bg-red-100 transition-colors">Sair da Conta</button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-safe pt-2 px-6 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto pb-4">
          <div onClick={() => setAbaAtual('inicio')} className={`flex flex-col items-center gap-1 cursor-pointer ${abaAtual === 'inicio' ? 'text-[#5a31f4]' : 'text-gray-400'}`}><span className="text-lg">🏠</span><span className="text-[10px] font-bold">Início</span></div>
          <div onClick={() => setAbaAtual('explorar')} className={`flex flex-col items-center gap-1 cursor-pointer ${abaAtual === 'explorar' ? 'text-[#5a31f4]' : 'text-gray-400'}`}><span className="text-lg">🧭</span><span className="text-[10px] font-bold">Explorar</span></div>
          <div onClick={() => exigirLogin(() => setTelaLivroAberta(true))} className="flex flex-col items-center cursor-pointer -mt-5 hover:scale-105 transition-transform"><div className="w-12 h-12 bg-[#5a31f4] rounded-full flex items-center justify-center text-white text-xl border-4 border-white shadow-md">✒️</div><span className="text-[10px] font-bold text-[#5a31f4] mt-0.5">Publicar</span></div>
          <div onClick={() => exigirLogin(() => setAbaAtual('biblioteca'))} className={`flex flex-col items-center gap-1 cursor-pointer ${abaAtual === 'biblioteca' ? 'text-[#5a31f4]' : 'text-gray-400'}`}><span className="text-lg">📖</span><span className="text-[10px] font-bold">Biblioteca</span></div>
          <div onClick={() => exigirLogin(() => setAbaAtual('perfil'))} className={`flex flex-col items-center gap-1 cursor-pointer ${abaAtual === 'perfil' ? 'text-[#5a31f4]' : 'text-gray-400'}`}><span className="text-lg">👤</span><span className="text-[10px] font-bold">Perfil</span></div>
        </div>
      </nav>
    </div>
  )
}

export default App