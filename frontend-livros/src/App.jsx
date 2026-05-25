import { useState, useEffect } from 'react'

const API_URL = 'http://172.16.21.21:8000'

function App() {
  // --- Estados do Usuário ---
  const [token, setToken] = useState(localStorage.getItem('meu_token_jwt') || '')
  const [usuarioId, setUsuarioId] = useState(Number(localStorage.getItem('meu_usuario_id')) || null)
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [usuarioExibido, setUsuarioExibido] = useState(null)
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensagem, setMensagem] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [username, setUsername] = useState('')
  const [nomePerfil, setNomePerfil] = useState('')
  const [modoLogin, setModoLogin] = useState(true);

  // --- Estados do Perfil e Seguidores ---
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [perfilForm, setPerfilForm] = useState({ nome_perfil: '', bio: '', redes_sociais: '' })

  // --- Estados do Livro ---
  const [livros, setLivros] = useState([])
  const [tituloNovo, setTituloNovo] = useState('')
  const [sinopseNova, setSinopseNova] = useState('')
  const [arquivoCapa, setArquivoCapa] = useState(null)
  const [idioma, setIdioma] = useState('Português')
  const [tipoHistoria, setTipoHistoria] = useState('Ficção')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
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

  // --- Estados do Explorar ---
  const [tagsEmAlta, setTagsEmAlta] = useState([])
  const [livrosPorTag, setLivrosPorTag] = useState({})

  // --- Estados de Biblioteca e Listas ---
  const [minhasListas, setMinhasListas] = useState([])
  const [modalNovaLista, setModalNovaLista] = useState(false)
  const [formLista, setFormLista] = useState({ nome: '', descricao: '' })
  const [modalSalvarLivro, setModalSalvarLivro] = useState(false)

  // ==========================================
  // EFEITOS DE INICIALIZAÇÃO E CONTROLE
  // ==========================================
  useEffect(() => {
    if (!livroSelecionado) buscarLivros()
  }, [livroSelecionado])

  useEffect(() => {
    carregarMeuPerfil()
    buscarMinhasListas()
  }, [token])

  useEffect(() => {
    if (abaAtual === 'explorar') carregarExplorar();
    if (abaAtual === 'biblioteca') buscarMinhasListas();
  }, [abaAtual])

  const exigirLogin = (acao_permitida) => {
    if (token) acao_permitida()
    else setMostrarLogin(true)
  }

  // ==========================================
  // LÓGICA DE API - USUÁRIOS E PERFIL
  // ==========================================
  const fazerCadastro = async (e) => {
    e.preventDefault();
    try {
      const resposta = await fetch(`${API_URL}/usuarios/`, {
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
      const resposta = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
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

  const alternarSeguir = async (usuarioAlvoId) => {
    const estaSeguindo = usuarioLogado?.seguindo.some(u => u.id === usuarioAlvoId);
    const metodo = estaSeguindo ? 'DELETE' : 'POST';
    const rota = estaSeguindo ? 'deixar-de-seguir' : 'seguir';

    try {
      const res = await fetch(`${API_URL}/usuarios/${usuarioAlvoId}/${rota}`, {
        method: metodo,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) carregarMeuPerfil();
    } catch (e) { alert("Erro ao processar ação."); }
  };

  const renderizarAbaSeguindo = () => (
    <div className="px-6 py-8 animate-fade-in max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Quem você segue</h2>
      <div className="space-y-4">
        {usuarioLogado?.seguindo.length === 0 ? (
          <p className="text-gray-500">Você ainda não segue ninguém.</p>
        ) : (
          usuarioLogado?.seguindo.map(autor => (
            <div key={autor.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <img src={autor.url_foto_perfil || '👤'} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold">{autor.nome_perfil}</h4>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      irParaPerfilAutor(livro.autor_id);
                    }}
                    className="text-sm text-gray-500 hover:text-[#5a31f4] cursor-pointer underline"
                  >
                    @{livro.autor?.username?.replace('@', '')}
                  </span>
                </div>
              </div>
              <button onClick={() => alternarSeguir(autor.id)} className="text-xs bg-gray-100 px-4 py-2 rounded-full font-bold">Deixar de seguir</button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const sair = () => {
    localStorage.removeItem('meu_token_jwt');
    localStorage.removeItem('meu_usuario_id');
    setToken('');
    setUsuarioId(null);
    setUsuarioLogado(null);
    setLivros([]);
    setLivroSelecionado(null);
    setMensagem('');
    setTelaLivroAberta(false);
    setAbaAtual('inicio');
    setMinhasListas([]);
    buscarLivros();
  }

  const carregarMeuPerfil = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/usuarios/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const dados = await res.json();
        setUsuarioLogado(dados);
        setPerfilForm({ nome_perfil: dados.nome_perfil || '', bio: dados.bio || '', redes_sociais: dados.redes_sociais || '' });
      } else if (res.status === 401) {
        sair();
        alert("Sua sessão expirou ou a conta foi removida. Por favor, faça login novamente.");
      }
    } catch (e) { }
  }

  const irParaPerfilAutor = async (autorId) => {
    try {
      const res = await fetch(`${API_URL}/usuarios/${autorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();

        setUsuarioExibido(dados);
        setLivroSelecionado(null);
        setAbaAtual('perfil_autor');

      }
    } catch (e) {
      console.error("Erro ao carregar perfil do autor:", e);
      alert("Erro ao carregar perfil do autor.");
    }
  };

  const salvarEdicaoPerfil = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/usuarios/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(perfilForm)
      });
      if (res.ok) { carregarMeuPerfil(); setEditandoPerfil(false); }
    } catch (e) { }
  }

  const fazerUploadImagem = async (arquivo) => {
    const formData = new FormData(); formData.append('file', arquivo)
    try {
      const res = await fetch(`${API_URL}/upload-imagem`, { method: 'POST', body: formData })
      if (res.ok) { const dados = await res.json(); return dados.url_imagem; }
      return null;
    } catch (e) { return null; }
  }

  const mudarImagemPerfil = async (tipo, arquivo) => {
    if (!arquivo) return;
    const url = await fazerUploadImagem(arquivo);
    if (url) {
      await fetch(`${API_URL}/usuarios/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(tipo === 'foto' ? { url_foto_perfil: url } : { url_capa_perfil: url })
      });
      carregarMeuPerfil();
    }
  }

  // ==========================================
  // LÓGICA DE API - LIVROS
  // ==========================================
  const buscarLivros = async () => { try { const res = await fetch(`${API_URL}/livros/`); if (res.ok) setLivros(await res.json()); } catch (e) { } }

  const salvarLivro = async (e) => {
    e.preventDefault()
    let capaFinal = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"

    if (arquivoCapa) {
      const urlUpload = await fazerUploadImagem(arquivoCapa);
      if (urlUpload) capaFinal = urlUpload;
      else { alert("Erro ao subir imagem."); return; }
    } else if (livroEditandoId) {
      const livroAntigo = livros.find(l => l.id === livroEditandoId)
      if (livroAntigo) capaFinal = livroAntigo.url_capa
    }

    const url = livroEditandoId ? `${API_URL}/livros/${livroEditandoId}` : `${API_URL}/livros/`
    const metodo = livroEditandoId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          titulo: tituloNovo,
          sinopse: sinopseNova,
          url_capa: capaFinal,
          idioma,
          tipo_historia: tipoHistoria,
          tags: tags.join(', '),
          direitos_autorais: direitosAutorais,
          classificacao_adulto: classificacaoAdulto,
          personagens_principais: personagensPrincipais,
          publico_alvo: publicoAlvo
        })
      })
      if (res.ok) {
        const livroSalvo = await res.json();
        setTituloNovo(''); setSinopseNova(''); setArquivoCapa(null); setIdioma('Português'); setTipoHistoria('Ficção'); setTags([]); setDireitosAutorais('Todos os Direitos Reservados'); setClassificacaoAdulto(false); setPersonagensPrincipais(''); setPublicoAlvo('Jovem Adulto (13-18 anos)');

        if (livroEditandoId) {
          setLivroSelecionado(livroSalvo);
        }

        setLivroEditandoId(null); setTelaLivroAberta(false); buscarLivros();
      }
    } catch (e) { }
  }

  const deletarLivro = async (id) => { if (!window.confirm("Apagar?")) return; try { const res = await fetch(`${API_URL}/livros/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) buscarLivros(); } catch (e) { } }

  const iniciarEdicaoLivro = (livro) => {
    setTituloNovo(livro.titulo);
    setSinopseNova(livro.sinopse);
    setIdioma(livro.idioma || 'Português');
    setTipoHistoria(livro.tipo_historia || 'Ficção');
    setTags(livro.tags ? livro.tags.split(',').map(t => t.trim()) : []);
    setDireitosAutorais(livro.direitos_autorais || 'Todos os Direitos Reservados');
    setClassificacaoAdulto(livro.classificacao_adulto || false);
    setPersonagensPrincipais(livro.personagens_principais || '');
    setPublicoAlvo(livro.publico_alvo || 'Jovem Adulto (13-18 anos)');
    setLivroEditandoId(livro.id);
    setTelaLivroAberta(true);
  }

  const abrirLivro = async (livro) => {
    if (!token) {
      setMostrarLogin(true);
      return;
    }
    setLivroSelecionado(livro);
    setCapituloLendo(null);
    try {
      const res = await fetch(`${API_URL}/livros/${livro.id}/capitulos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCapitulos(await res.json());
    } catch (e) { }
  }

  // ==========================================
  // LÓGICA DE API - CAPÍTULOS
  // ==========================================
  const salvarCapitulo = async (e) => {
    e.preventDefault();
    const url = capituloEditandoId ? `${API_URL}/capitulos/${capituloEditandoId}` : `${API_URL}/capitulos/`;
    const metodo = capituloEditandoId ? 'PUT' : 'POST';
    const capAtual = capitulos.find(c => c.id === capituloEditandoId);
    const ordem = capAtual ? capAtual.ordem_leitura : capitulos.length + 1;

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          livro_id: livroSelecionado.id,
          titulo_do_capitulo: tituloCapitulo,
          conteudo_texto: conteudoCapitulo,
          ordem_leitura: ordem
        })
      });

      if (res.ok) {
        setTituloCapitulo('');
        setConteudoCapitulo('');
        setCapituloEditandoId(null);
        abrirLivro(livroSelecionado);
      } else {
        alert("Erro ao salvar o capítulo.");
      }
    } catch (e) {
      alert("Erro de conexão ao tentar salvar o capítulo.");
    }
  }

  const deletarCapitulo = async (id) => { if (!window.confirm("Apagar?")) return; try { const res = await fetch(`${API_URL}/capitulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) abrirLivro(livroSelecionado); } catch (e) { } }

  const iniciarEdicaoCapitulo = (cap) => { setTituloCapitulo(cap.titulo_do_capitulo); setConteudoCapitulo(cap.conteudo_texto); setCapituloEditandoId(cap.id); }

  const iniciarLeituraCapitulo = async (cap) => {
    setCapituloLendo(cap);
    try {
      await fetch(`${API_URL}/capitulos/${cap.id}/visualizar`, { method: 'POST' });
      buscarLivros();

      const res = await fetch(`${API_URL}/livros/${livroSelecionado.id}/capitulos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

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
      const res = await fetch(`${API_URL}/capitulos/${capId}/curtir`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();
        setCapituloLendo(prev => prev ? { ...prev, curtidas_totales: dados.curtidas_totales } : prev);
        setCapitulos(prev => prev.map(c => c.id === capId ? { ...c, curtidas_totales: dados.curtidas_totales } : c));
        buscarLivros();
      } else {
        const erro = await res.json();
        alert(`Erro na API: ${erro.detail || "Falha no servidor"}`);
      }
    } catch (e) {
      alert("Erro de conexão ao tentar curtir o capítulo.");
    }
  }

  // ==========================================
  // LÓGICA DE API - EXPLORAR
  // ==========================================
  const carregarExplorar = async () => {
    try {
      const resTags = await fetch(`${API_URL}/explorar/tags-em-alta`);
      if (resTags.ok) {
        const tagsData = await resTags.json();
        setTagsEmAlta(tagsData);

        const catalogo = {};
        for (let tagObj of tagsData) {
          const resLivros = await fetch(`${API_URL}/explorar/livros-por-tag?tag=${tagObj.nome}`);
          if (resLivros.ok) {
            catalogo[tagObj.nome] = await resLivros.json();
          }
        }
        setLivrosPorTag(catalogo);
      }
    } catch (e) { }
  }

  // ==========================================
  // LÓGICA DE API - LISTAS DE LEITURA
  // ==========================================
  const buscarMinhasListas = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/usuarios/me/listas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMinhasListas(await res.json());
    } catch (e) { }
  }

  const criarLista = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/listas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formLista)
      });
      if (res.ok) {
        setFormLista({ nome: '', descricao: '' });
        setModalNovaLista(false);
        buscarMinhasListas();
      }
    } catch (e) { }
  }

  const alterarLivroNaLista = async (listaId, adicionar = true) => {
    if (!livroSelecionado) return;
    const acao = adicionar ? 'adicionar' : 'remover';
    const metodo = adicionar ? 'POST' : 'DELETE';

    try {
      const res = await fetch(`${API_URL}/listas/${listaId}/${acao}/${livroSelecionado.id}`, {
        method: metodo,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        buscarMinhasListas();
        if (adicionar) setModalSalvarLivro(false);
      } else {
        const erro = await res.json();
        alert(erro.detail || "Erro ao modificar a lista.");
      }
    } catch (e) { }
  }

  const verificaSeLivroEstaNaLista = (lista) => {
    if (!livroSelecionado) return false;
    return lista.livros.some(l => l.id === livroSelecionado.id);
  }

  const livrosRecentes = [...livros].reverse();

  // ==========================================
  // RENDERIZAÇÃO: MODAL NOVA LISTA
  // ==========================================
  const renderizarModalNovaLista = () => {
    if (!modalNovaLista) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Nova Lista</h3>
          <form onSubmit={criarLista} className="flex flex-col gap-3">
            <input type="text" placeholder="Nome da lista (ex: Favoritos)" value={formLista.nome} onChange={e => setFormLista({ ...formLista, nome: e.target.value })} required className="p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5a31f4] text-sm" />
            <textarea placeholder="Descrição (opcional)" value={formLista.descricao} onChange={e => setFormLista({ ...formLista, descricao: e.target.value })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5a31f4] text-sm h-20" />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setModalNovaLista(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-[#5a31f4] text-white font-bold rounded-xl text-sm shadow-md">Criar</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA DE LOGIN 
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
  // RENDERIZAÇÃO: CRIAÇÃO / EDIÇÃO DE OBRA
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

          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-gray-50 border border-gray-100 focus-within:ring-2 focus-within:ring-[#5a31f4]">
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map((tag, index) => (
                <span key={index} className="bg-[#f3efff] text-[#5a31f4] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((_, i) => i !== index))} className="hover:text-red-500 font-bold text-sm">&times;</button>
                </span>
              ))}
              <input
                type="text"
                placeholder={tags.length === 0 ? "Digite uma tag e aperte Enter..." : "Adicionar mais..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const novaTag = tagInput.trim();
                    if (novaTag && !tags.includes(novaTag)) { setTags([...tags, novaTag]); setTagInput(''); }
                  }
                }}
                className="bg-transparent outline-none flex-1 min-w-[150px] text-sm p-1"
              />
            </div>
          </div>

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
  // RENDERIZAÇÃO: LEITURA E CAPÍTULOS
  // ==========================================
  if (livroSelecionado) {
    const souDonoDoLivro = token && livroSelecionado.autor_id === usuarioId
    const livroAtualizado = livros.find(l => l.id === livroSelecionado.id) || livroSelecionado;

    return (
      <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-8 font-sans pb-24 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setLivroSelecionado(null);
                // Se você veio de um perfil de autor, volta pra ele, se não, volta pro início
                if (!usuarioExibido) {
                  setAbaAtual('inicio');
                }
              }}
              className="text-[#5a31f4] hover:underline font-semibold flex items-center gap-2"
            >
              ← Voltar
            </button>

            {/* BOTÃO DE SALVAR NA LISTA (Aparece para todos logados) */}
            {token && !capituloLendo && (
              <div className="relative">
                <button onClick={() => setModalSalvarLivro(!modalSalvarLivro)} className="bg-[#f3efff] text-[#5a31f4] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#e9e2ff] flex items-center gap-2 transition-colors">
                  <span>+</span> Salvar na Lista
                </button>

                {/* MODAL SUSPENSO DAS LISTAS */}
                {modalSalvarLivro && (
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-2">Suas Listas</h4>
                    <div className="max-h-48 overflow-y-auto">
                      {minhasListas.length === 0 ? (
                        <p className="text-xs text-gray-500 p-2 text-center">Você não tem listas.</p>
                      ) : (
                        minhasListas.map(lista => {
                          const estaNaLista = verificaSeLivroEstaNaLista(lista);
                          return (
                            <button key={lista.id} onClick={() => alterarLivroNaLista(lista.id, !estaNaLista)} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl flex items-center justify-between transition-colors">
                              <span className="text-sm font-medium text-gray-800 line-clamp-1">{lista.nome}</span>
                              {estaNaLista && <span className="text-[#5a31f4]">✔</span>}
                            </button>
                          )
                        })
                      )}
                    </div>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button onClick={() => { setModalSalvarLivro(false); setModalNovaLista(true); }} className="w-full text-left p-3 hover:bg-[#f3efff] rounded-xl text-sm font-bold text-[#5a31f4] flex items-center gap-2">
                        <span>+</span> Criar nova lista
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-8 flex flex-col md:flex-row gap-6 items-start">
            <img src={livroSelecionado.url_capa} className="w-32 h-48 object-cover rounded-2xl shadow-md" alt="Capa" />
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{livroSelecionado.titulo}</h1>
              <p className="text-[14px] text-gray-500 font-medium mb-4">
                Por{' '}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    // Usamos livroSelecionado.autor_id aqui!
                    irParaPerfilAutor(livroSelecionado.autor_id);
                  }}
                  className="text-[#5a31f4] hover:underline cursor-pointer font-bold"
                >
                  @{livroSelecionado.autor?.username?.replace('@', '')}
                </span>
              </p>

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
        {renderizarModalNovaLista()}
      </div>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO: NAVEGAÇÃO PRINCIPAL E ABAS
  // ==========================================
  return (
    <div className="min-h-screen bg-white text-gray-900 pb-28 font-sans">
      <header className="px-4 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAbaAtual('inicio')}>
          <div className="w-8 h-8 bg-[#5a31f4] rounded-[10px] flex items-center justify-center text-white text-sm shadow-md">✒️</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Páginas</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>

          <div onClick={() => exigirLogin(() => setAbaAtual('perfil'))} className="w-10 h-10 rounded-full border-2 border-[#dcd1f3] flex items-center justify-center text-sm cursor-pointer overflow-hidden bg-gray-100 hover:scale-105 transition-transform">
            {usuarioLogado?.url_foto_perfil ? <img src={usuarioLogado.url_foto_perfil} className="w-full h-full object-cover" /> : '👤'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* ABA INÍCIO */}
        {abaAtual === 'inicio' && (
          <div className="px-4 sm:px-6 animate-fade-in">
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
          </div>
        )}

        {/* ABA EXPLORAR */}
        {abaAtual === 'explorar' && (
          <div className="px-4 sm:px-6 animate-fade-in pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Explorar</h2>
            <p className="text-sm text-gray-500 mb-8">Descubra as histórias que estão bombando na plataforma agora.</p>

            {tagsEmAlta.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <span className="text-3xl mb-2 block">🔍</span>
                <p className="text-gray-500 text-sm font-medium">Nenhuma tag em alta no momento.</p>
              </div>
            ) : (
              tagsEmAlta.map((tagObj) => (
                <div key={tagObj.nome} className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                      <span className="bg-[#f3efff] text-[#5a31f4] w-8 h-8 rounded-full flex items-center justify-center text-sm">#</span>
                      {tagObj.nome}
                    </h3>
                    <span className="text-[#5a31f4] text-[10px] font-bold bg-[#f8f7fb] px-2 py-1 rounded-lg">
                      🔥 {tagObj.pontos} pontos
                    </span>
                  </div>

                  <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
                    {livrosPorTag[tagObj.nome]?.length > 0 ? (
                      livrosPorTag[tagObj.nome].map((livro) => (
                        <div key={livro.id} className="min-w-[140px] max-w-[140px] h-[200px] rounded-[16px] overflow-hidden relative group cursor-pointer flex-shrink-0" onClick={() => abrirLivro(livro)}>
                          <img src={livro.url_capa} className="absolute inset-0 w-full h-full object-cover z-0" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
                          {livro.classificacao_adulto && <div className="absolute top-2 right-2 bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold z-20">+18</div>}
                          <div className="absolute bottom-2 left-2 right-2 z-20">
                            <h4 className="font-bold text-white text-xs mb-0.5 line-clamp-2">{livro.titulo}</h4>
                            <p className="text-[9px] text-gray-300 mb-1">@{livro.autor?.username?.replace('@', '') || 'autor'}</p>
                            <div className="flex gap-2 text-[9px] text-gray-300">
                              <span>👁 {livro.visualizacoes || 0}</span><span>♡ {livro.curtidas_totales || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">Nenhum livro encontrado para esta tag.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA BIBLIOTECA */}
        {abaAtual === 'biblioteca' && (
          <div className="px-4 sm:px-6 animate-fade-in pt-6">
            <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sua Estante</h2>
                <p className="text-sm text-gray-500">Histórias guardadas para ler depois.</p>
              </div>
              <button onClick={() => setModalNovaLista(true)} className="bg-[#f3efff] text-[#5a31f4] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#e9e2ff] transition-colors">+ Nova Lista</button>
            </div>

            {minhasListas.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4 border border-dashed border-gray-300">📚</div>
                <h4 className="font-bold text-gray-800 mb-1">Nenhuma lista criada</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-6">Organize suas histórias favoritas em coleções personalizadas para ler mais tarde.</p>
                <button onClick={() => setModalNovaLista(true)} className="bg-[#5a31f4] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-[#4924c9] transition-colors">Criar minha primeira lista</button>
              </div>
            ) : (
              <div className="space-y-8">
                {minhasListas.map(lista => (
                  <div key={lista.id} className="bg-[#f8f7fb] rounded-3xl p-6 border border-gray-100">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{lista.nome}</h3>
                      {lista.descricao && <p className="text-sm text-gray-500 mt-1">{lista.descricao}</p>}
                      <p className="text-xs font-bold text-[#5a31f4] mt-2 bg-white inline-block px-3 py-1 rounded-full shadow-sm">{lista.livros.length} livros</p>
                    </div>

                    <div className="flex overflow-x-auto pb-2 gap-4 snap-x hide-scrollbar mt-4">
                      {lista.livros.length > 0 ? (
                        lista.livros.map(livro => (
                          <div key={livro.id} className="min-w-[120px] max-w-[120px] cursor-pointer group flex-shrink-0" onClick={() => abrirLivro(livro)}>
                            <div className="h-[170px] rounded-2xl overflow-hidden relative mb-2 shadow-sm border border-gray-200">
                              <img src={livro.url_capa} className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            </div>
                            <h4 className="font-bold text-gray-800 text-xs mb-0.5 line-clamp-1">{livro.titulo}</h4>
                            <p className="text-[10px] text-gray-500 line-clamp-1">
                              Por{' '}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation(); // Impede que o clique abra o livro ao invés do perfil
                                  irParaPerfilAutor(livro.autor_id); // Usa o autor_id do livro
                                }}
                                className="hover:text-[#5a31f4] cursor-pointer underline"
                              >
                                @{livro.autor?.username?.replace('@', '')}
                              </span>
                            </p>                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic py-4">Esta lista está vazia. Salve alguns livros nela!</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {abaAtual === 'seguindo' && renderizarAbaSeguindo()}

        {/* ABA PERFIL */}
        {abaAtual === 'perfil' && usuarioLogado && (
          <div className="pb-10 animate-fade-in">
            <div className="relative bg-[#5a3e36] h-48 sm:h-64 rounded-b-3xl w-full group overflow-hidden"
              style={{ backgroundImage: `url(${usuarioLogado.url_capa_perfil || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <label className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                📷 Alterar Capa
                <input type="file" accept="image/*" className="hidden" onChange={(e) => mudarImagemPerfil('capa', e.target.files[0])} />
              </label>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 relative flex flex-col items-center -mt-16 sm:-mt-20">
              <div className="relative group">
                <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full p-1 shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                    {usuarioLogado.url_foto_perfil ? <img src={usuarioLogado.url_foto_perfil} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full text-4xl">👤</div>}
                  </div>
                </div>
                <label className="absolute bottom-2 right-2 bg-[#5a31f4] text-white p-2.5 rounded-full cursor-pointer shadow-md hover:bg-[#4924c9] transition-transform hover:scale-105">
                  ✏️
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => mudarImagemPerfil('foto', e.target.files[0])} />
                </label>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">{usuarioLogado.nome_perfil}</h2>
              <p className="text-sm text-gray-500 font-medium">@{usuarioLogado.username}</p>

              <div className="flex gap-8 sm:gap-12 mt-6 mb-8 text-center border-t border-b border-gray-100 py-4 w-full justify-center">
                <div><span className="block font-bold text-lg text-gray-900">{livros.filter(l => l.autor_id === usuarioLogado.id).length}</span><span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Obras</span></div>
                <div><span className="block font-bold text-lg text-gray-900">{minhasListas.length}</span><span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Listas</span></div>
                <div onClick={() => setAbaAtual('seguindo')} className="cursor-pointer hover:opacity-75 transition-opacity">
                  <span className="block font-bold text-lg text-gray-900">{usuarioLogado.seguindo.length}</span>
                  <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Autores</span>
                </div>
                <div><span className="block font-bold text-lg text-gray-900">0</span><span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Seguidores</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-4">
                <div className="col-span-1 bg-[#f8f7fb] p-6 rounded-3xl border border-gray-100 h-fit">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-900">Sobre</h3>
                    {!editandoPerfil && <button onClick={() => setEditandoPerfil(true)} className="text-xs text-[#5a31f4] font-bold hover:underline">Editar</button>}
                  </div>

                  {editandoPerfil ? (
                    <form onSubmit={salvarEdicaoPerfil} className="flex flex-col gap-3">
                      <input type="text" value={perfilForm.nome_perfil} onChange={e => setPerfilForm({ ...perfilForm, nome_perfil: e.target.value })} className="p-2 text-sm rounded-lg border w-full outline-none focus:ring-1 focus:ring-[#5a31f4]" placeholder="Nome" />
                      <textarea value={perfilForm.bio} onChange={e => setPerfilForm({ ...perfilForm, bio: e.target.value })} className="p-2 text-sm rounded-lg border w-full h-24 outline-none focus:ring-1 focus:ring-[#5a31f4]" placeholder="Escreva sobre você..." />
                      <input type="text" value={perfilForm.redes_sociais} onChange={e => setPerfilForm({ ...perfilForm, redes_sociais: e.target.value })} className="p-2 text-sm rounded-lg border w-full outline-none focus:ring-1 focus:ring-[#5a31f4]" placeholder="Link das redes (Ex: insta.com/seu_arroba)" />
                      <div className="flex gap-2 mt-2">
                        <button type="submit" className="flex-1 bg-[#5a31f4] text-white text-xs font-bold py-2 rounded-lg">Salvar</button>
                        <button type="button" onClick={() => setEditandoPerfil(false)} className="flex-1 bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg">Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{usuarioLogado.bio || "Este autor ainda não escreveu uma biografia."}</p>
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                        <p className="text-xs text-gray-500 flex items-center gap-2">📅 Entrou em: <span className="font-semibold text-gray-800">{usuarioLogado.data_cadastro}</span></p>
                        {usuarioLogado.redes_sociais && <p className="text-xs text-gray-500 flex items-center gap-2">🔗 Redes: <a href={usuarioLogado.redes_sociais.startsWith('http') ? usuarioLogado.redes_sociais : `https://${usuarioLogado.redes_sociais}`} target="_blank" rel="noreferrer" className="text-[#5a31f4] font-semibold hover:underline truncate">{usuarioLogado.redes_sociais}</a></p>}
                      </div>
                      <button onClick={sair} className="w-full mt-6 px-4 py-2.5 bg-red-50 text-red-500 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors">Sair da Conta</button>
                    </>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-gray-900">Listas de Leitura</h3>
                    <button onClick={() => setModalNovaLista(true)} className="text-sm bg-[#f3efff] text-[#5a31f4] px-4 py-2 rounded-xl font-bold hover:bg-[#e9e2ff] transition-colors">+ Criar lista</button>
                  </div>

                  {minhasListas.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4 border border-dashed border-gray-300">📚</div>
                      <h4 className="font-bold text-gray-800 mb-1">Nenhuma lista criada</h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto">Organize suas histórias favoritas em coleções personalizadas para ler mais tarde.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {minhasListas.map(lista => (
                        <div key={lista.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-[#5a31f4] transition-colors flex justify-between items-center cursor-pointer" onClick={() => setAbaAtual('biblioteca')}>
                          <div>
                            <h4 className="font-bold text-gray-900">{lista.nome}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{lista.livros.length} livros salvos</p>
                          </div>
                          <span className="text-gray-400">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
            {renderizarModalNovaLista()}
          </div>
        )}

        {/* ABA PERFIL DE AUTOR */}
        {abaAtual === 'perfil_autor' && usuarioExibido && (
          <div className="px-6 py-8 animate-fade-in max-w-2xl mx-auto pb-24">
            <button
              onClick={() => { setAbaAtual('inicio'); setUsuarioExibido(null); }}
              className="mb-6 text-sm text-gray-500 font-bold hover:text-[#5a31f4] transition-colors"
            >
              ← Voltar para Início
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-6 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <img
                src={usuarioExibido.url_foto_perfil || 'https://ui-avatars.com/api/?name=' + usuarioExibido.nome_perfil}
                className="w-24 h-24 rounded-full object-cover border-4 border-[#f3efff]"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{usuarioExibido.nome_perfil}</h2>
                <p className="text-gray-500 font-medium mb-4">@{usuarioExibido.username}</p>

                <button
                  onClick={() => alternarSeguir(usuarioExibido.id)}
                  className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all shadow-md ${usuarioLogado?.seguindo?.some(u => u.id === usuarioExibido.id)
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-[#5a31f4] text-white hover:bg-[#4924c9]"
                    }`}
                >
                  {usuarioLogado?.seguindo?.some(u => u.id === usuarioExibido.id) ? "Seguindo" : "Seguir Autor"}
                </button>
              </div>
            </div>

            {/* Biografia */}
            <div className="bg-[#f8f7fb] p-6 rounded-3xl mb-8 border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2">Sobre</h4>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {usuarioExibido.bio || "Este autor ainda não escreveu uma biografia."}
              </p>
            </div>

            {/* Obras do Autor */}
            <h3 className="font-bold text-xl mb-6">Obras publicadas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {livros.filter(l => l.autor_id === usuarioExibido.id).map(livro => (
                <div
                  key={livro.id}
                  className="cursor-pointer group"
                  onClick={() => abrirLivro(livro)}
                >
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-sm mb-3 group-hover:scale-[1.02] transition-transform">
                    <img src={livro.url_capa} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-[#5a31f4]">
                    {livro.titulo}
                  </h4>
                </div>
              ))}
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