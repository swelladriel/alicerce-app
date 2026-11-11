// ============================================
// API PLATAFORMA ALICERCE
// Transforma a planilha em API que a plataforma lê
// ============================================

const PLANILHA_ID = '1GKiSoslU8H9O3fVYgYXVEGjmsJcKPpLldbmxYZXN9I8';

// Função principal - recebe requisições GET
function doGet(e) {
  const acao = e.parameter.acao || 'tudo';
  let resultado;

  switch(acao) {
    case 'clientes':
      resultado = lerAba('Clientes');
      break;
    case 'corretores':
      resultado = lerAba('Corretores');
      break;
    case 'registros':
      resultado = lerAba('Registros945');
      break;
    case 'demandas':
      resultado = lerAba('Demandas');
      break;
    case 'unica':
      resultado = lerAba('UnicaCoisa');
      break;
    case 'reunioes':
      resultado = lerAba('Reunioes');
      break;
    case 'empreendimentos':
      resultado = lerAba('Empreendimentos');
      break;
    case 'vendas':
      resultado = lerAba('Vendas');
      break;
    case 'agenda':
      resultado = lerAba('Agenda');
      break;
    case 'concluir':
      resultado = concluirDemanda(e.parameter.resp, e.parameter.desc, e.parameter.data, e.parameter.por);
      break;
    case 'add_demanda':
      resultado = adicionarLinhas('Demandas', [{
        'DATA': e.parameter.dt || '',
        'RESPONSAVEL': e.parameter.resp || '',
        'DESCRICAO': decodeURIComponent(e.parameter.desc || ''),
        'TIPO': e.parameter.tipo || 'ia-refinada-v2',
        'PRIORIDADE': e.parameter.prior || 'Media',
        'CLIENTE': decodeURIComponent(e.parameter.cliente || ''),
        'STATUS': 'Pendente',
        'DATA CONCLUSAO': '',
        'OBSERVACOES': e.parameter.obs || 'Refinada por IA'
      }]);
      break;
    case 'add_foco':
      resultado = adicionarLinhas('UnicaCoisa', [{
        'DATA': e.parameter.dt || '',
        'CORRETOR': e.parameter.corretor || '',
        'FOCO': decodeURIComponent(e.parameter.foco || ''),
        'POR QUE': decodeURIComponent(e.parameter.pq || ''),
        'FONTE': e.parameter.fonte || '',
        'STATUS': 'Pendente',
        'DIFICULDADE': decodeURIComponent(e.parameter.dif || ''),
        'FACILIDADE': decodeURIComponent(e.parameter.fac || '')
      }]);
      break;
    case 'limpar_auto945_get':
      resultado = limparAuto945();
      break;
    case '945_hoje':
      resultado = get945Hoje();
      break;
    case 'checkin':
      resultado = adicionarLinhas('Registros945', [JSON.parse(e.parameter.registro)]);
      break;
    case 'processar945':
      processarNovas945();
      resultado = { sucesso: true, msg: '945 processadas' };
      break;
    case 'tudo':
      resultado = {
        clientes: lerAba('Clientes'),
        corretores: lerAba('Corretores'),
        registros: lerAba('Registros945'),
        demandas: lerAba('Demandas'),
        unicaCoisa: lerAba('UnicaCoisa'),
        reunioes: lerAba('Reunioes'),
        empreendimentos: lerAba('Empreendimentos'),
        vendas: lerAba('Vendas'),
        agenda: lerAba('Agenda'),
        real: lerAba('Real'),
        atualizado: new Date().toISOString()
      };
      break;
    case 'tv': {
      // Retorna só dados necessários pra página da TV (leve, ~30-50KB em vez de 416KB)
      const INICIO_MES = '2026-08-05';
      const todosCorretores = lerAba('Corretores');
      // Vendas: retornar mês atual E anterior (pra não perder dados na virada)
      const todasVendas = lerAba('Vendas').filter(v => {
        const mc = String(v.MES_COMERCIAL || '').substring(0, 7);
        return mc === INICIO_MES.substring(0, 7) || mc === '2026-07';
      });
      const todosRegistros = lerAba('Registros945').filter(r => {
        const dt = String(r.DATA || '').substring(0, 10);
        return dt >= INICIO_MES;
      });
      const todaAgenda = lerAba('Agenda').filter(a => {
        const dt = String(a.DATA || '').substring(0, 10);
        return dt >= INICIO_MES;
      });
      const todosClientes = lerAba('Clientes').filter(c => {
        const dt = String(c['DATA CRIAÇÃO'] || c['DATA CRIACAO'] || '').substring(0, 10);
        return dt >= INICIO_MES;
      });
      resultado = {
        corretores: todosCorretores,
        vendas: todasVendas,
        registros: todosRegistros,
        agenda: todaAgenda,
        clientes: todosClientes,
        atualizado: new Date().toISOString()
      };
      break;
    }
    case 'hoje': {
      // Retorna só dados de hoje
      const hj = new Date();
      hj.setHours(hj.getHours() - 3); // UTC-3 Brasília
      const hjStr = hj.toISOString().substring(0, 10);
      const registros = lerAba('Registros945').filter(r => String(r.DATA || '').substring(0, 10) === hjStr);
      const demandas = lerAba('Demandas').filter(d => String(d.DATA || '').substring(0, 10) === hjStr);
      const agenda = lerAba('Agenda').filter(a => String(a.DATA || '').substring(0, 10) === hjStr);
      const unica = lerAba('UnicaCoisa').filter(u => String(u.DATA || '').substring(0, 10) === hjStr);
      resultado = {
        data: hjStr,
        corretores: lerAba('Corretores'),
        registros: registros,
        demandas: demandas,
        agenda: agenda,
        unicaCoisa: unica,
        vendas: lerAba('Vendas'),
        atualizado: new Date().toISOString()
      };
      break;
    }
    case 'semana': {
      // Retorna dados da semana
      const agora = new Date();
      agora.setHours(agora.getHours() - 3);
      const diaSem = agora.getDay();
      const seg = new Date(agora);
      seg.setDate(seg.getDate() - (diaSem === 0 ? 6 : diaSem - 1));
      const segStr = seg.toISOString().substring(0, 10);
      const hjSem = agora.toISOString().substring(0, 10);
      const filtroSemana = (item, campo) => {
        const dt = String(item[campo] || '').substring(0, 10);
        return dt >= segStr && dt <= hjSem;
      };
      resultado = {
        periodo: { inicio: segStr, fim: hjSem },
        corretores: lerAba('Corretores'),
        registros: lerAba('Registros945').filter(r => filtroSemana(r, 'DATA')),
        demandas: lerAba('Demandas').filter(d => filtroSemana(d, 'DATA')),
        agenda: lerAba('Agenda').filter(a => filtroSemana(a, 'DATA')),
        unicaCoisa: lerAba('UnicaCoisa').filter(u => filtroSemana(u, 'DATA')),
        vendas: lerAba('Vendas'),
        atualizado: new Date().toISOString()
      };
      break;
    }
    case 'real':
      resultado = lerAba('Real');
      break;
    case 'swell_vendas': {
      // Lê vendas do Swell da aba SwellVendas
      resultado = lerAba('SwellVendas');
      break;
    }
    case 'diagnostico_vipcred': {
      // Busca emails recentes da VipCred com resultado de análise
      // Retorna o HTML bruto pra saber se é texto ou imagem
      const qtd = parseInt(e.parameter.qtd) || 3;
      const buscas = [
        'from:analise.vipcred@swellimobiliaria.com after:2026/08/01',
        'from:vipcred after:2026/08/01'
      ];
      const ids = new Set();
      const emails = [];
      buscas.forEach(q => {
        try {
          GmailApp.search(q, 0, 10).forEach(t => {
            t.getMessages().forEach(m => {
              if (ids.has(m.getId())) return;
              ids.add(m.getId());
              const htmlBody = m.getBody() || '';
              const plainBody = m.getPlainBody() || '';
              const temCondicionada = htmlBody.toLowerCase().includes('condicionada');
              const temAprovada = htmlBody.toLowerCase().includes('aprovad');
              const temImg = htmlBody.includes('<img');
              const temTable = htmlBody.includes('<table');
              emails.push({
                id: m.getId(),
                de: m.getFrom(),
                assunto: m.getSubject(),
                data: m.getDate().toISOString(),
                temCondicionada: temCondicionada,
                temAprovada: temAprovada,
                temImgTag: temImg,
                temTableTag: temTable,
                htmlLength: htmlBody.length,
                plainLength: plainBody.length,
                plainPreview: plainBody.substring(0, 500),
                htmlPreview: htmlBody.substring(0, 2000)
              });
            });
          });
        } catch(err) {}
      });
      emails.sort((a,b) => b.data.localeCompare(a.data));
      resultado = emails.slice(0, qtd);
      break;
    }
    case 'add_real':
      resultado = adicionarLinhas('Real', [{
        'DATA': e.parameter.dt || new Date().toISOString().split('T')[0],
        'CORRETOR': decodeURIComponent(e.parameter.corretor || ''),
        'CLIENTE': decodeURIComponent(e.parameter.cliente || ''),
        'TELEFONE': decodeURIComponent(e.parameter.telefone || ''),
        'VGV_ESTIMADO': e.parameter.vgv || '',
        'EMPREENDIMENTO': decodeURIComponent(e.parameter.emp || ''),
        'CONSTRUTORA': decodeURIComponent(e.parameter.construtora || ''),
        'STATUS': e.parameter.status || 'GERANDO',
        'PENDENCIA': decodeURIComponent(e.parameter.pendencia || ''),
        'DATA_ENTRADA': e.parameter.entrada || new Date().toISOString().split('T')[0],
        'COMISSAO_STATUS': e.parameter.comissao || 'NÃO PAGO',
        'ACIONADO': e.parameter.acionado || 'S'
      }]);
      break;
    case 'aprovados_pendentes':
      resultado = obterAprovadosPendentes();
      break;
    case 'crm_cards':
      resultado = lerAba('CRM');
      break;
    case 'crm_colunas':
      resultado = lerAba('CRMColunas');
      break;
    case 'salvar_crm_card': {
      const dadosCrm = JSON.parse(e.parameter.dados || '{}');
      const ss_crm = SpreadsheetApp.openById(PLANILHA_ID);
      let abaCRM = ss_crm.getSheetByName('CRM');
      if (!abaCRM) {
        abaCRM = ss_crm.insertSheet('CRM');
        abaCRM.getRange(1, 1, 1, 10).setValues([['ID', 'CORRETOR', 'NOME', 'TELEFONE', 'EMAIL', 'OBS', 'COLUNA', 'ORDEM', 'CRIADO_EM', 'ATUALIZADO_EM']]);
      }
      const cardId = dadosCrm.id || '';
      const cardData = dadosCrm.card || {};
      const agoraCrm = new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
      if (cardId) {
        const allData = abaCRM.getDataRange().getValues();
        for (let i = 1; i < allData.length; i++) {
          if (String(allData[i][0]) === String(cardId)) {
            abaCRM.getRange(i + 1, 2, 1, 9).setValues([[
              cardData.CORRETOR !== undefined ? cardData.CORRETOR : allData[i][1],
              cardData.NOME !== undefined ? cardData.NOME : allData[i][2],
              cardData.TELEFONE !== undefined ? cardData.TELEFONE : allData[i][3],
              cardData.EMAIL !== undefined ? cardData.EMAIL : allData[i][4],
              cardData.OBS !== undefined ? cardData.OBS : allData[i][5],
              cardData.COLUNA !== undefined ? cardData.COLUNA : allData[i][6],
              cardData.ORDEM !== undefined ? cardData.ORDEM : allData[i][7],
              allData[i][8],
              agoraCrm
            ]]);
            resultado = { ok: true, acao: 'atualizado', id: cardId };
            break;
          }
        }
        if (!resultado) resultado = { erro: 'Card nao encontrado: ' + cardId };
      } else {
        const novoId = 'crm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        abaCRM.appendRow([novoId, cardData.CORRETOR || '', cardData.NOME || '', cardData.TELEFONE || '', cardData.EMAIL || '', cardData.OBS || '', cardData.COLUNA || 'Agendamento', cardData.ORDEM || 0, agoraCrm, agoraCrm]);
        resultado = { ok: true, acao: 'criado', id: novoId };
      }
      break;
    }
    case 'deletar_crm_card': {
      const dadosDel = JSON.parse(e.parameter.dados || '{}');
      const ss_crm2 = SpreadsheetApp.openById(PLANILHA_ID);
      const abaCRM2 = ss_crm2.getSheetByName('CRM');
      if (!abaCRM2) { resultado = { erro: 'Aba CRM nao existe' }; break; }
      const allRows = abaCRM2.getDataRange().getValues();
      let deleted = false;
      for (let i = allRows.length - 1; i >= 1; i--) {
        if (String(allRows[i][0]) === String(dadosDel.id)) {
          abaCRM2.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      resultado = deleted ? { ok: true, deletado: dadosDel.id } : { erro: 'Card nao encontrado' };
      break;
    }
    case 'salvar_crm_colunas': {
      const dadosCol = JSON.parse(e.parameter.dados || '{}');
      const ss_crm3 = SpreadsheetApp.openById(PLANILHA_ID);
      let abaCol = ss_crm3.getSheetByName('CRMColunas');
      if (!abaCol) {
        abaCol = ss_crm3.insertSheet('CRMColunas');
        abaCol.getRange(1, 1, 1, 3).setValues([['CORRETOR', 'COLUNAS_JSON', 'ATUALIZADO_EM']]);
      }
      const corrNome = dadosCol.corretor;
      const colunasJson = JSON.stringify(dadosCol.colunas);
      const agoraC = new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
      const colData = abaCol.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < colData.length; i++) {
        if (String(colData[i][0]).trim().toLowerCase() === String(corrNome).trim().toLowerCase()) {
          abaCol.getRange(i + 1, 2, 1, 2).setValues([[colunasJson, agoraC]]);
          found = true;
          break;
        }
      }
      if (!found) abaCol.appendRow([corrNome, colunasJson, agoraC]);
      resultado = { ok: true, corretor: corrNome };
      break;
    }
    default:
      resultado = { erro: 'Ação não reconhecida. Use: clientes, corretores, registros, demandas, unica, reunioes, empreendimentos, real, tudo' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função principal - recebe requisições POST (para escrita)
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const acao = dados.acao;
    let resultado;

    switch(acao) {
      case 'adicionar_registro':
        resultado = adicionarLinhas('Registros945', dados.registros);
        break;
      case 'adicionar_demanda':
        resultado = adicionarLinhas('Demandas', dados.demandas);
        break;
      case 'adicionar_agenda':
        resultado = adicionarLinhas('Agenda', dados.agendamentos);
        break;
      case 'adicionar_unica':
        resultado = adicionarLinhas('UnicaCoisa', dados.itens);
        break;
      case 'adicionar_reuniao':
        resultado = adicionarLinhas('Reunioes', dados.reunioes);
        break;
      case 'adicionar_cliente':
        resultado = adicionarLinhas('Clientes', dados.clientes);
        break;
      case 'adicionar_cliente_crm':
        resultado = adicionarClienteCRM(dados);
        break;
      case 'adicionar_venda':
        resultado = adicionarLinhas('Vendas', dados.vendas);
        break;
      case 'atualizar_venda':
        resultado = atualizarVenda(dados.busca, dados.campos);
        break;
      case 'adicionar_corretor':
        resultado = adicionarLinhas('Corretores', dados.corretores);
        break;
      case 'atualizar_corretor':
        resultado = atualizarCorretor(dados.nome, dados.campos);
        break;
      case 'atualizar_cliente':
        resultado = atualizarPorCPF(dados.cpf, dados.campos);
        break;
      case 'atualizar_agenda':
        resultado = atualizarAgenda(dados.busca, dados.campos);
        break;
      case 'salvar_foto_atendimento':
        resultado = salvarFotoAtendimento(dados);
        break;
      case 'concluir_demanda':
        resultado = concluirDemanda(dados.responsavel, dados.descricao, dados.data, dados.concluidoPor);
        break;
      case 'limpar_auto945':
        resultado = limparAuto945();
        break;
      case 'limpar_atendimentos_duplicados':
        resultado = limparAtendimentosDuplicados();
        break;
      case 'limpar_demandas_duplicadas':
        resultado = limparDemandasDuplicadas();
        break;
      case 'reprocessar_emails_corretor':
        resultado = reprocessarEmailsCorretor(dados.email_from, dados.nome_corretor);
        break;
      case 'deletar_clientes_corretor':
        resultado = deletarClientesCorretor(dados.nome_corretor);
        break;
      case 'padronizar_corretores':
        resultado = padronizarCorretores();
        break;
      case 'remover_duplicados':
        resultado = removerDuplicadosCPF();
        break;
      case 'corrigir_nome_corretor':
        resultado = corrigirNomeCorretor(dados.nome_atual, dados.nome_correto);
        break;
      case 'corrigir_horarios_agenda':
        resultado = corrigirHorariosAgenda();
        break;
      case 'corrigir_horarios_registros':
        resultado = corrigirHorariosRegistros();
        break;
      case 'atualizar_corretor_cliente':
        resultado = atualizarCorretorCliente(dados.cpf, dados.corretor);
        break;
      case 'corrigir_datas_reprocessamento':
        resultado = corrigirDatasReprocessamento();
        break;
      case 'corrigir_corretora':
        resultado = corrigirCorretora(dados.nome_corretor);
        break;
      case 'adicionar_colunas_crm':
        resultado = adicionarColunasCRM();
        break;
      case 'adicionar_real':
        resultado = adicionarLinhas('Real', dados.clientes);
        break;
      case 'atualizar_real':
        resultado = atualizarReal(dados.busca, dados.campos);
        break;
      case 'deletar_real':
        resultado = deletarReal(dados.corretor, dados.cliente);
        break;
      case 'ativar_cliente_real':
        resultado = ativarClienteReal(dados);
        break;
      case 'limpar_real_total':
        resultado = limparReal();
        break;
      case 'salvar_crm_card': {
        // Salva ou atualiza um card no CRM
        const ss_crm = SpreadsheetApp.openById(PLANILHA_ID);
        let abaCRM = ss_crm.getSheetByName('CRM');
        if (!abaCRM) {
          abaCRM = ss_crm.insertSheet('CRM');
          abaCRM.getRange(1, 1, 1, 10).setValues([['ID', 'CORRETOR', 'NOME', 'TELEFONE', 'EMAIL', 'OBS', 'COLUNA', 'ORDEM', 'CRIADO_EM', 'ATUALIZADO_EM']]);
        }
        const cardId = dados.id || '';
        const cardData = dados.card;
        if (cardId) {
          // Atualizar card existente — buscar pela coluna ID
          const allData = abaCRM.getDataRange().getValues();
          for (let i = 1; i < allData.length; i++) {
            if (String(allData[i][0]) === String(cardId)) {
              const row = i + 1;
              abaCRM.getRange(row, 2, 1, 9).setValues([[
                cardData.CORRETOR || allData[i][1],
                cardData.NOME || allData[i][2],
                cardData.TELEFONE !== undefined ? cardData.TELEFONE : allData[i][3],
                cardData.EMAIL !== undefined ? cardData.EMAIL : allData[i][4],
                cardData.OBS !== undefined ? cardData.OBS : allData[i][5],
                cardData.COLUNA !== undefined ? cardData.COLUNA : allData[i][6],
                cardData.ORDEM !== undefined ? cardData.ORDEM : allData[i][7],
                allData[i][8],
                new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})
              ]]);
              resultado = { ok: true, acao: 'atualizado', id: cardId };
              break;
            }
          }
          if (!resultado) resultado = { erro: 'Card nao encontrado: ' + cardId };
        } else {
          // Novo card
          const novoId = 'crm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const agora = new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
          abaCRM.appendRow([
            novoId,
            cardData.CORRETOR || '',
            cardData.NOME || '',
            cardData.TELEFONE || '',
            cardData.EMAIL || '',
            cardData.OBS || '',
            cardData.COLUNA || 'Agendamento',
            cardData.ORDEM || 0,
            agora,
            agora
          ]);
          resultado = { ok: true, acao: 'criado', id: novoId };
        }
        break;
      }
      case 'deletar_crm_card': {
        const ss_crm2 = SpreadsheetApp.openById(PLANILHA_ID);
        const abaCRM2 = ss_crm2.getSheetByName('CRM');
        if (!abaCRM2) { resultado = { erro: 'Aba CRM nao existe' }; break; }
        const delId = dados.id;
        const allRows = abaCRM2.getDataRange().getValues();
        let deleted = false;
        for (let i = allRows.length - 1; i >= 1; i--) {
          if (String(allRows[i][0]) === String(delId)) {
            abaCRM2.deleteRow(i + 1);
            deleted = true;
            break;
          }
        }
        resultado = deleted ? { ok: true, deletado: delId } : { erro: 'Card nao encontrado' };
        break;
      }
      case 'salvar_crm_colunas': {
        // Salva colunas personalizadas de um corretor
        const ss_crm3 = SpreadsheetApp.openById(PLANILHA_ID);
        let abaCol = ss_crm3.getSheetByName('CRMColunas');
        if (!abaCol) {
          abaCol = ss_crm3.insertSheet('CRMColunas');
          abaCol.getRange(1, 1, 1, 4).setValues([['CORRETOR', 'COLUNAS_JSON', 'ATUALIZADO_EM']]);
        }
        const corrNome = dados.corretor;
        const colunasJson = JSON.stringify(dados.colunas);
        const agoraCol = new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
        // Buscar se ja tem registro desse corretor
        const colData = abaCol.getDataRange().getValues();
        let found = false;
        for (let i = 1; i < colData.length; i++) {
          if (String(colData[i][0]).trim().toLowerCase() === String(corrNome).trim().toLowerCase()) {
            abaCol.getRange(i + 1, 2, 1, 2).setValues([[colunasJson, agoraCol]]);
            found = true;
            break;
          }
        }
        if (!found) {
          abaCol.appendRow([corrNome, colunasJson, agoraCol]);
        }
        resultado = { ok: true, corretor: corrNome };
        break;
      }
      default:
        resultado = { erro: 'Ação POST não reconhecida.' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// LER ABA - retorna array de objetos (com cache por execução)
// ============================================
const _cacheAbas = {};

function lerAba(nomeAba) {
  // Cache: evita ler a mesma aba várias vezes na mesma execução (ex: acao=tudo)
  if (_cacheAbas[nomeAba]) return _cacheAbas[nomeAba];

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];

  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) return [];

  const cabecalho = dados[0].map(c => String(c).trim());
  const registros = [];

  for (let i = 1; i < dados.length; i++) {
    const obj = {};
    let temDado = false;
    for (let j = 0; j < cabecalho.length; j++) {
      const valor = dados[i][j];
      obj[cabecalho[j]] = valor instanceof Date ? valor.toISOString() : valor;
      if (valor !== '' && valor !== null && valor !== undefined) temDado = true;
    }
    if (temDado) registros.push(obj);
  }

  _cacheAbas[nomeAba] = registros;
  return registros;
}

// ============================================
// ADICIONAR LINHAS - insere dados em uma aba
// ============================================
function adicionarLinhas(nomeAba, linhas) {
  if (!linhas || !linhas.length) return { erro: 'Sem dados para inserir' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return { erro: 'Aba não encontrada: ' + nomeAba };

  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c).trim());

  // Montar todas as linhas de uma vez pra inserir em batch (muito mais rápido)
  const rows = linhas.map(item => cabecalho.map(col => item[col] !== undefined ? item[col] : ''));

  if (rows.length > 0) {
    const ultimaLinha = aba.getLastRow();
    const range = aba.getRange(ultimaLinha + 1, 1, rows.length, cabecalho.length);

    // Forçar coluna HORA como texto puro em QUALQUER aba (evita Sheets converter pra número de tempo)
    const colHora = cabecalho.indexOf('HORA');
    if (colHora >= 0) {
      range.setValues(rows);
      for (let i = 0; i < rows.length; i++) {
        const celulaHora = aba.getRange(ultimaLinha + 1 + i, colHora + 1);
        celulaHora.setNumberFormat('@'); // formato texto
        celulaHora.setValue(rows[i][colHora]);
      }
    } else {
      range.setValues(rows);
    }
  }

  return { sucesso: true, inseridos: rows.length, aba: nomeAba };
}

// ============================================
// ATUALIZAR AGENDA (remarcar, bolo, atendido)
// ============================================
function atualizarAgenda(busca, campos) {
  if (!busca || !campos) return { erro: 'Busca e campos obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Agenda');
  if (!aba) return { erro: 'Aba Agenda não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0].map(c => String(c).trim());

  for (let i = 1; i < dados.length; i++) {
    let match = true;
    Object.keys(busca).forEach(campo => {
      const colIdx = cabecalho.indexOf(campo);
      if (colIdx < 0) { match = false; return; }
      const valorPlanilha = String(dados[i][colIdx] instanceof Date ? dados[i][colIdx].toISOString() : (dados[i][colIdx] || '')).trim();
      const valorBusca = String(busca[campo] || '').trim();
      // Comparar substring pra datas (planilha pode ter formato diferente)
      if (campo === 'DATA') {
        if (!valorPlanilha.substring(0, 10).includes(valorBusca.substring(0, 10)) && valorBusca.substring(0, 10) !== valorPlanilha.substring(0, 10)) match = false;
      } else if (campo === 'HORA') {
        const h1 = valorPlanilha.replace(/.*T/, '').substring(0, 5);
        const h2 = valorBusca.replace(/.*T/, '').substring(0, 5);
        if (h1 !== h2 && valorPlanilha.substring(0, 5) !== valorBusca.substring(0, 5)) match = false;
      } else {
        if (valorPlanilha.toUpperCase() !== valorBusca.toUpperCase()) match = false;
      }
    });

    if (match) {
      Object.keys(campos).forEach(campo => {
        const colIdx = cabecalho.indexOf(campo);
        if (colIdx >= 0) {
          aba.getRange(i + 1, colIdx + 1).setValue(campos[campo]);
        }
      });
      return { sucesso: true, linha: i + 1 };
    }
  }

  return { erro: 'Agendamento não encontrado' };
}

// ============================================
// ATUALIZAR VENDA POR CLIENTE + MES_COMERCIAL
// ============================================
function atualizarVenda(busca, campos) {
  if (!busca || !campos) return { erro: 'Busca e campos obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Vendas');
  if (!aba) return { erro: 'Aba Vendas não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0].map(c => String(c).trim());

  for (let i = 1; i < dados.length; i++) {
    let match = true;
    Object.keys(busca).forEach(campo => {
      const colIdx = cabecalho.indexOf(campo);
      if (colIdx < 0) { match = false; return; }
      const valorPlanilha = String(dados[i][colIdx] || '').trim().toUpperCase();
      const valorBusca = String(busca[campo] || '').trim().toUpperCase();
      if (!valorPlanilha.includes(valorBusca) && !valorBusca.includes(valorPlanilha)) match = false;
    });

    if (match) {
      Object.keys(campos).forEach(campo => {
        const colIdx = cabecalho.indexOf(campo);
        if (colIdx >= 0) {
          aba.getRange(i + 1, colIdx + 1).setValue(campos[campo]);
        }
      });
      return { sucesso: true, linha: i + 1, cliente: String(dados[i][cabecalho.indexOf('CLIENTE')] || '') };
    }
  }

  return { erro: 'Venda não encontrada', busca: busca };
}

// ============================================
// ATUALIZAR CLIENTE POR CPF
// ============================================
function atualizarPorCPF(cpf, campos) {
  if (!cpf) return { erro: 'CPF não informado' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  if (!aba) return { erro: 'Aba Clientes não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0].map(c => String(c).trim());
  const colCPF = cabecalho.indexOf('CPF');

  for (let i = 1; i < dados.length; i++) {
    const cpfLimpo = String(dados[i][colCPF]).replace(/[^0-9.-]/g, '').trim();
    if (cpfLimpo === cpf.trim()) {
      Object.keys(campos).forEach(campo => {
        const colIdx = cabecalho.indexOf(campo);
        if (colIdx >= 0) {
          aba.getRange(i + 1, colIdx + 1).setValue(campos[campo]);
        }
      });
      const colDataAtual = cabecalho.indexOf('DATA ATUALIZAÇÃO');
      if (colDataAtual >= 0) {
        aba.getRange(i + 1, colDataAtual + 1).setValue(new Date());
      }
      return { sucesso: true, linha: i + 1, cpf: cpf };
    }
  }

  return { erro: 'CPF não encontrado: ' + cpf };
}

// ============================================
// ADICIONAR COLUNAS CRM — TELEFONE, EMAIL, OBSERVACOES na aba Clientes
// ============================================
function adicionarColunasCRM() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c).trim());

  const colunasNovas = ['TELEFONE', 'EMAIL', 'OBSERVACOES'];
  const adicionadas = [];

  colunasNovas.forEach(col => {
    if (!cabecalho.includes(col)) {
      const novaCol = cabecalho.length + adicionadas.length + 1;
      aba.getRange(1, novaCol).setValue(col);
      adicionadas.push(col);
    }
  });

  return { sucesso: true, adicionadas: adicionadas, msg: adicionadas.length > 0 ? 'Colunas adicionadas: ' + adicionadas.join(', ') : 'Todas as colunas já existem' };
}

// ============================================
// ADICIONAR CLIENTE CRM — com deduplicação por CPF, telefone e nome
// ============================================
function adicionarClienteCRM(dados) {
  if (!dados.CLIENTE || dados.CLIENTE.trim().split(/\s+/).length < 2) return { erro: 'Nome e sobrenome obrigatórios' };
  // CPF, telefone e email obrigatórios só se não vier do agendamento
  const viaAgendamento = !dados.CPF && !dados.EMAIL;
  if (!viaAgendamento && !dados.TELEFONE) return { erro: 'Telefone obrigatório' };
  if (!viaAgendamento && !dados.EMAIL) return { erro: 'Email obrigatório' };
  if (!viaAgendamento && !dados.CPF) return { erro: 'CPF obrigatório' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  const todosClientes = aba.getDataRange().getValues();
  const cabecalho = todosClientes[0].map(c => String(c).trim());
  const colCPF = cabecalho.indexOf('CPF');
  const colCliente = cabecalho.indexOf('CLIENTE');
  const colTelefone = cabecalho.indexOf('TELEFONE');

  const cpfLimpo = String(dados.CPF || '').replace(/[^0-9]/g, '');

  // 1. Verificar CPF duplicado (só se CPF foi informado)
  if (cpfLimpo) {
  for (let i = 1; i < todosClientes.length; i++) {
    const cpfExistente = String(todosClientes[i][colCPF] || '').replace(/[^0-9]/g, '');
    if (cpfExistente && cpfExistente === cpfLimpo) {
      // Atualizar dados faltantes em vez de duplicar
      const campos = {};
      if (dados.TELEFONE && colTelefone >= 0) {
        const telExistente = String(todosClientes[i][colTelefone] || '').trim();
        if (!telExistente) campos['TELEFONE'] = dados.TELEFONE;
      }
      const colEmail = cabecalho.indexOf('EMAIL');
      if (dados.EMAIL && colEmail >= 0) {
        const emailExistente = String(todosClientes[i][colEmail] || '').trim();
        if (!emailExistente) campos['EMAIL'] = dados.EMAIL;
      }
      if (dados.STATUS && dados.STATUS !== 'AGENDADO') campos['STATUS'] = dados.STATUS;
      if (dados.AGENDADO) campos['AGENDADO'] = dados.AGENDADO;
      campos['DATA ATUALIZAÇÃO'] = new Date().toISOString();

      Object.keys(campos).forEach(campo => {
        const colIdx = cabecalho.indexOf(campo);
        if (colIdx >= 0) aba.getRange(i + 1, colIdx + 1).setValue(campos[campo]);
      });

      return { sucesso: true, acao: 'atualizado', msg: 'Cliente já existe (CPF). Dados atualizados.', linha: i + 1, cpf: dados.CPF };
    }
  }
  } // fecha if (cpfLimpo)

  // 2. Verificar telefone duplicado
  if (colTelefone >= 0) {
    const telLimpo = String(dados.TELEFONE).replace(/[^0-9]/g, '');
    for (let i = 1; i < todosClientes.length; i++) {
      const telExistente = String(todosClientes[i][colTelefone] || '').replace(/[^0-9]/g, '');
      if (telExistente && telExistente === telLimpo) {
        const nomeExistente = String(todosClientes[i][colCliente] || '');
        return { sucesso: false, acao: 'duplicata_telefone', msg: 'Já existe cliente com esse telefone: ' + nomeExistente, cliente_existente: nomeExistente };
      }
    }
  }

  // 3. Verificar nome muito parecido
  const nomeNorm = String(dados.CLIENTE).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  for (let i = 1; i < todosClientes.length; i++) {
    const existente = String(todosClientes[i][colCliente] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (existente && existente === nomeNorm) {
      return { sucesso: false, acao: 'duplicata_nome', msg: 'Já existe cliente com esse nome: ' + todosClientes[i][colCliente], cliente_existente: String(todosClientes[i][colCliente]) };
    }
  }

  // 4. Adicionar novo cliente
  const novoCliente = {
    'CORRETOR': dados.CORRETOR || '',
    'CLIENTE': dados.CLIENTE.trim().toUpperCase(),
    'CPF': dados.CPF,
    'TELEFONE': dados.TELEFONE,
    'EMAIL': dados.EMAIL,
    'RENDA': dados.RENDA || '',
    'STATUS': (dados.STATUS && dados.STATUS !== 'AGENDADO') ? dados.STATUS : 'PENDENTE',
    'VALOR APROVADO': '',
    'FAIXA': '',
    'TETO IMÓVEL': '',
    'REGIÃO': dados.REGIAO || '',
    'DATA CRIAÇÃO': new Date().toISOString(),
    'DATA ATUALIZAÇÃO': new Date().toISOString(),
    'AGENDADO': dados.AGENDADO || ''
  };

  const row = cabecalho.map(col => novoCliente[col] !== undefined ? novoCliente[col] : '');
  const ultimaLinha = aba.getLastRow();
  aba.getRange(ultimaLinha + 1, 1, 1, row.length).setValues([row]);

  return { sucesso: true, acao: 'criado', msg: 'Cliente adicionado com sucesso', linha: ultimaLinha + 1 };
}

// ============================================
// CONCLUIR DEMANDA (atualiza linha existente)
// ============================================
function concluirDemanda(responsavel, descricao, data, concluidoPor) {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Demandas');
  if (!aba) return { erro: 'Aba Demandas não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0].map(c => String(c).trim());
  const colResp = cabecalho.indexOf('RESPONSAVEL');
  const colDesc = cabecalho.indexOf('DESCRICAO');
  const colData = cabecalho.indexOf('DATA');
  const colStatus = cabecalho.indexOf('STATUS');
  const colDataConc = cabecalho.indexOf('DATA CONCLUSAO');
  const colObs = cabecalho.indexOf('OBSERVACOES');

  // Normalizar data recebida (pode vir como 2026-06-23 ou 2026-06-23T03:00:00.000Z)
  const dataNorm = data ? data.substring(0, 10) : '';

  // Normalizar texto pra comparação segura (remove acentos, lowercase, espaços extras)
  function normalizar(str) {
    return String(str).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }
  const respNorm = normalizar(responsavel);
  const descNorm = normalizar(descricao);

  for (let i = 1; i < dados.length; i++) {
    const resp = normalizar(dados[i][colResp]);
    const desc = normalizar(dados[i][colDesc]);
    const dtRaw = dados[i][colData];
    const dt = dtRaw instanceof Date ? dtRaw.toISOString().substring(0, 10) : String(dtRaw).substring(0, 10);

    if (resp === respNorm && desc === descNorm && dt === dataNorm) {
      aba.getRange(i + 1, colStatus + 1).setValue('Concluida');
      if (colDataConc >= 0) aba.getRange(i + 1, colDataConc + 1).setValue(new Date());
      if (colObs >= 0) aba.getRange(i + 1, colObs + 1).setValue('Concluída por ' + (concluidoPor || 'App'));
      return { sucesso: true, linha: i + 1, responsavel: responsavel };
    }
  }

  return { erro: 'Demanda não encontrada' };
}

// ============================================
// REMOVER DUPLICADOS POR CPF (mantém o primeiro)
// ============================================
function removerDuplicadosCPF() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  if (!aba) return { erro: 'Aba Clientes não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabDup = dados[0].map(c => String(c).trim());
  const colCPF = cabDup.indexOf('CPF');
  const colCorretor = cabDup.indexOf('CORRETOR');
  if (colCPF < 0) return { erro: 'Coluna CPF não encontrada na aba Clientes' };

  // Agrupar por CPF: guardar todas as linhas de cada CPF
  const cpfLinhas = {};
  for (let i = 1; i < dados.length; i++) {
    const cpf = String(dados[i][colCPF]).replace(/[^0-9.\-]/g, '').trim();
    if (!cpf) continue;
    if (!cpfLinhas[cpf]) cpfLinhas[cpf] = [];
    const corretor = colCorretor >= 0 ? String(dados[i][colCorretor]).trim() : '';
    cpfLinhas[cpf].push({ linha: i + 1, corretor: corretor });
  }

  const linhasRemover = [];
  const correcoes = [];

  for (const cpf in cpfLinhas) {
    const entradas = cpfLinhas[cpf];
    if (entradas.length <= 1) continue;

    // Escolher a melhor: preferir a que tem corretor real (nao NAO IDENTIFICADO)
    const comCorretor = entradas.filter(e => e.corretor && e.corretor !== 'NÃO IDENTIFICADO' && e.corretor !== 'NAO IDENTIFICADO');
    let manter;
    if (comCorretor.length > 0) {
      manter = comCorretor[0]; // manter a primeira com corretor real
    } else {
      manter = entradas[0]; // se todas sao NAO IDENTIFICADO, manter a primeira
    }

    // Se a que vamos manter tem corretor real mas uma outra entrada (mais antiga) nao tem,
    // copiar o corretor real pra entrada mais antiga e remover a mais nova
    const maisAntiga = entradas[0];
    if (manter !== maisAntiga && colCorretor >= 0) {
      // Atualizar corretor na linha mais antiga
      aba.getRange(maisAntiga.linha, colCorretor + 1).setValue(manter.corretor);
      correcoes.push({ cpf: cpf, de: maisAntiga.corretor, para: manter.corretor });
      // Remover todas exceto a mais antiga (que agora tem o corretor certo)
      entradas.filter(e => e !== maisAntiga).forEach(e => linhasRemover.push(e.linha));
    } else {
      // Manter a primeira, remover o resto
      entradas.slice(1).forEach(e => linhasRemover.push(e.linha));
    }
  }

  // Remover de baixo pra cima
  linhasRemover.sort((a, b) => b - a);
  linhasRemover.forEach(linha => {
    aba.deleteRow(linha);
  });

  return { sucesso: true, removidos: linhasRemover.length, correcoes: correcoes };
}

// ============================================
// INTERPRETAR 945 E GERAR DEMANDAS AUTOMATICAMENTE
// Roda a cada 5 minutos via trigger
// ============================================
function processarNovas945() {
  // Lock pra evitar execução simultânea (trigger + chamada manual) que duplicaria demandas
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return; // Se já tem outra execução rodando, sai

  try {
    _processarNovas945Impl();
  } finally {
    lock.releaseLock();
  }
}

function _processarNovas945Impl() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const abaReg = ss.getSheetByName('Registros945');
  const abaDem = ss.getSheetByName('Demandas');
  if (!abaReg || !abaDem) return;

  const dados = abaReg.getDataRange().getValues();
  const cabReg = dados[0].map(c => String(c).trim());
  const colTipo = cabReg.indexOf('TIPO');
  const colObs = cabReg.indexOf('OBSERVACOES');
  const colCorr = cabReg.indexOf('CORRETOR');
  const colData = cabReg.indexOf('DATA');
  const colEquipe = cabReg.indexOf('EQUIPE');
  // Usar coluna PROCESSADO dedicada (se não existir, cria)
  let colProc = cabReg.indexOf('PROCESSADO');
  if (colProc < 0) {
    const ultimaCol = abaReg.getLastColumn();
    abaReg.getRange(1, ultimaCol + 1).setValue('PROCESSADO');
    colProc = ultimaCol; // índice 0-based = ultimaCol (pois ultimaCol é 1-based)
  }

  let geradas = 0;

  for (let i = 1; i < dados.length; i++) {
    const tipo = String(dados[i][colTipo]).trim();
    const processado = String(dados[i][colProc] || '').trim();

    // Só processar 945-individual que ainda não foram processadas
    if (tipo !== '945-individual') continue;
    if (processado === 'PROCESSADO') continue;

    const texto = String(dados[i][colObs]).trim();
    const corretor = String(dados[i][colCorr]).trim();
    const dataRaw = dados[i][colData];
    const data = dataRaw instanceof Date ? dataRaw.toISOString().substring(0, 10) : String(dataRaw).substring(0, 10);
    const equipe = String(dados[i][colEquipe]).trim();

    if (!texto || !corretor) continue;

    // Extrair demandas do texto
    const demandas = extrairDemandas(texto, corretor, data, equipe);

    // Inserir demandas na aba
    const cabDem = abaDem.getRange(1, 1, 1, abaDem.getLastColumn() || 9).getValues()[0].map(c => String(c).trim());
    demandas.forEach(d => {
      const row = cabDem.map(col => d[col] !== undefined ? d[col] : '');
      abaDem.appendRow(row);
      geradas++;
    });

    // Marcar como processado
    abaReg.getRange(i + 1, colProc + 1).setValue('PROCESSADO');
  }

  Logger.log('945 processadas. Demandas geradas: ' + geradas);
}

function extrairDemandas(texto, corretor, data, equipe) {
  const demandas = [];
  const frasesEncontradas = new Set();

  // Palavras-chave de ação (futuro/plano)
  const acoes = ['tenho que', 'preciso', 'vou', 'pretendo', 'hoje eu', 'minha meta', 'meu objetivo',
    'finalizar', 'resolver', 'organizar', 'fazer', 'cobrar', 'atender', 'ligar',
    'entrar em contato', 'acompanhar', 'verificar', 'subir', 'declarar', 'fechar',
    'validar', 'validação', 'apuração', 'apuracao', 'produção', 'producao',
    'pedir', 'posicionar', 'marcar', 'agendar', 'confirmar', 'retornar', 'postar'];

  // Palavras que indicam passado (ignorar)
  const passado = ['ontem', 'semana passada', 'eu fiz', 'eu resolvi', 'eu liguei', 'eu atendi',
    'o que eu fiz', 'o que fiz', 'fiz cinco', 'fiz duas', 'fiz três'];

  // Dividir texto em segmentos — transcrição de voz não tem pontuação
  // Dividir por palavras-chave de ação e por conectores
  let textoLimpo = texto.replace(/\s+/g, ' ').trim();

  // Inserir quebras antes de palavras-chave pra separar frases
  const separadores = ['preciso', 'tenho que', 'vou', 'pretendo', 'hoje eu', 'hoje',
    'finalizar', 'resolver', 'organizar', 'fazer a', 'fazer o', 'cobrar',
    'atender', 'ligar', 'entrar em contato', 'acompanhar', 'verificar',
    'subir', 'declarar', 'fechar', 'validar', 'apuração', 'apuracao',
    'produção', 'producao', 'pedir', 'posicionar', 'marcar', 'agendar',
    'confirmar', 'retornar', 'postar', 'e também', 'também preciso',
    'além disso', 'outra coisa'];

  separadores.forEach(sep => {
    const regex = new RegExp('(?<!^)\\b(' + sep + ')', 'gi');
    textoLimpo = textoLimpo.replace(regex, '|||$1');
  });

  const frases = textoLimpo.split('|||').map(f => f.trim()).filter(f => f.length > 8);

  frases.forEach(frase => {
    const fl = frase.toLowerCase();

    // Ignorar frases sobre o passado
    if (passado.some(p => fl.includes(p))) return;
    // Ignorar frases muito genéricas
    if (fl.includes('vamos lá') || fl.includes('testando') || fl.includes('é só um teste') || fl.includes('quero saber se')) return;

    // Verificar se contém palavras de ação
    const temAcao = acoes.some(a => fl.includes(a));
    if (!temAcao) return;

    // Limpar a frase
    let desc = frase.replace(/^(e |aí |então |também |e aí |é |bom )/i, '').trim();
    if (desc.length < 10) return;
    // Limitar tamanho
    if (desc.length > 120) desc = desc.substring(0, 120);
    // Capitalizar primeira letra
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);

    if (frasesEncontradas.has(desc.toLowerCase())) return;
    frasesEncontradas.add(desc.toLowerCase());

    // Determinar prioridade
    let prioridade = 'Media';
    const urgentes = ['finalizar', 'resolver', 'venda', 'fechar', 'validação', 'validar', 'apuração', 'hoje', 'urgente', 'caixa', 'subir pasta'];
    if (urgentes.some(u => fl.includes(u))) prioridade = 'Alta';

    // Extrair clientes mencionados
    let cliente = '';
    const clientePatterns = [
      /cliente\s+([A-ZÀ-Ú][a-záéíóúãõ]+(?:\s+[A-ZÀ-Ú][a-záéíóúãõ]+)?)/,
      /d[aeo]\s+([A-ZÀ-Ú][a-záéíóúãõ]+)/,
    ];
    for (const p of clientePatterns) {
      const m = frase.match(p);
      if (m) { cliente = m[1]; break; }
    }

    demandas.push({
      'DATA': data,
      'RESPONSAVEL': corretor,
      'DESCRICAO': desc,
      'TIPO': 'auto-945',
      'PRIORIDADE': prioridade,
      'CLIENTE': cliente,
      'STATUS': 'Pendente',
      'DATA CONCLUSAO': '',
      'OBSERVACOES': 'Gerado automaticamente da 945'
    });
  });

  // Se não encontrou nada com padrões, criar pelo menos uma demanda genérica
  if (demandas.length === 0 && texto.length > 20) {
    // Pegar a parte do texto que fala do futuro
    const partesFuturo = frases.filter(f => {
      const fl = f.toLowerCase();
      return !fl.startsWith('ontem') && !fl.includes('eu fiz') && f.length > 15;
    });
    if (partesFuturo.length > 0) {
      let desc = partesFuturo[0].trim();
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      demandas.push({
        'DATA': data,
        'RESPONSAVEL': corretor,
        'DESCRICAO': desc,
        'TIPO': 'auto-945',
        'PRIORIDADE': 'Media',
        'CLIENTE': '',
        'STATUS': 'Pendente',
        'DATA CONCLUSAO': '',
        'OBSERVACOES': 'Gerado automaticamente da 945'
      });
    }
  }

  return demandas;
}

// ============================================
// LIMPAR AUTO-945 — Remove demandas auto-945 pendentes
// Mantém só as ia-refinada-v2
// ============================================
function limparAuto945() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Demandas');
  const dados = aba.getDataRange().getValues();
  const header = dados[0];

  const colTipo = header.indexOf('TIPO');
  const colStatus = header.indexOf('STATUS');

  if (colTipo === -1 || colStatus === -1) return { erro: 'Colunas TIPO ou STATUS não encontradas' };

  // Percorrer de baixo pra cima pra não bagunçar índices ao deletar
  // Remove TODOS os auto-945 (Pendente, Concluida, ou qualquer status)
  // As demandas refinadas (ia-refinada-v2) são as definitivas
  let removidas = 0;
  for (let i = dados.length - 1; i >= 1; i--) {
    const tipo = String(dados[i][colTipo] || '').trim();
    if (tipo === 'auto-945') {
      aba.deleteRow(i + 1);
      removidas++;
    }
  }

  return { sucesso: true, removidas: removidas };
}

// ============================================
// LIMPAR DEMANDAS DUPLICADAS (ia-refinada-v2)
// Remove demandas do mesmo dia com mesmo RESPONSAVEL + mesmos primeiros 60 chars da DESCRICAO
// Mantém a primeira ocorrência, apaga as duplicatas
// ============================================
function limparDemandasDuplicadas() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Demandas');
  const dados = aba.getDataRange().getValues();
  const header = dados[0];

  const colData = header.indexOf('DATA');
  const colResp = header.indexOf('RESPONSAVEL');
  const colDesc = header.indexOf('DESCRICAO');
  const colTipo = header.indexOf('TIPO');

  if (colData === -1 || colResp === -1 || colDesc === -1 || colTipo === -1) {
    return { erro: 'Colunas não encontradas' };
  }

  const seen = new Set();
  let removidas = 0;

  for (let i = dados.length - 1; i >= 1; i--) {
    const tipo = String(dados[i][colTipo] || '').trim();
    if (tipo !== 'ia-refinada-v2') continue;

    const dataRaw = dados[i][colData];
    let dataStr = '';
    if (dataRaw instanceof Date) {
      dataStr = dataRaw.toISOString().substring(0, 10);
    } else {
      dataStr = String(dataRaw || '').substring(0, 10);
    }

    const resp = String(dados[i][colResp] || '').trim();
    const desc = String(dados[i][colDesc] || '').trim().substring(0, 60);
    const chave = dataStr + '|' + resp + '|' + desc;

    if (seen.has(chave)) {
      aba.deleteRow(i + 1);
      removidas++;
    } else {
      seen.add(chave);
    }
  }

  return { sucesso: true, removidas: removidas };
}

// ============================================
// LIMPAR ATENDIMENTOS DUPLICADOS E TESTES
// Remove registros de atendimento-confirmado duplicados (mesmo corretor+cliente+dia)
// e registros que contenham "teste" no campo CLIENTES
// ============================================
function limparAtendimentosDuplicados() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Registros945');
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colTipo = header.indexOf('TIPO');
  const colCorretor = header.indexOf('CORRETOR');
  const colClientes = header.indexOf('CLIENTES');
  const colData = header.indexOf('DATA');
  const colObs = header.indexOf('OBSERVACOES');

  const vistos = new Set();
  let removidos = 0;

  for (let i = dados.length - 1; i >= 1; i--) {
    const tipo = String(dados[i][colTipo] || '').trim();
    if (tipo !== 'atendimento-confirmado') continue;

    const corretor = String(dados[i][colCorretor] || '').trim();
    const cliente = String(dados[i][colClientes] || '').trim();
    const obs = String(dados[i][colObs] || '').trim();
    const dt = dados[i][colData] instanceof Date ? dados[i][colData].toISOString().split('T')[0] : String(dados[i][colData] || '').substring(0, 10);

    // Remover testes
    if (cliente.toLowerCase().includes('teste') || obs.toLowerCase().includes('teste')) {
      aba.deleteRow(i + 1);
      removidos++;
      continue;
    }

    // Remover duplicados
    const chave = corretor + '|' + cliente + '|' + dt;
    if (vistos.has(chave)) {
      aba.deleteRow(i + 1);
      removidos++;
    } else {
      vistos.add(chave);
    }
  }

  return { sucesso: true, removidos: removidos };
}

// ============================================
// DELETAR CLIENTES DE UM CORRETOR (pra reprocessar com data correta)
// ============================================
function deletarClientesCorretor(nomeCorretor) {
  if (!nomeCorretor) return { erro: 'Parâmetro nome_corretor obrigatório' };
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  const dados = aba.getDataRange().getValues();
  const colCorretor = dados[0].indexOf('CORRETOR');
  let removidos = 0;
  for (let i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][colCorretor] || '').trim() === nomeCorretor) {
      aba.deleteRow(i + 1);
      removidos++;
    }
  }
  return { sucesso: true, removidos: removidos };
}

// ============================================
// PADRONIZAR NOMES DE CORRETORES NA ABA CLIENTES
// Corrige grafias diferentes pro nome oficial da aba Corretores
// ============================================
function padronizarCorretores() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colCorretor = header.indexOf('CORRETOR');

  if (colCorretor === -1) return { erro: 'Coluna CORRETOR não encontrada' };

  // Mapa de correções: nome errado → nome oficial
  const correcoes = {
    'DANDARA CAMPOS': 'Dandara Campos',
    'Dandara Campos*': 'Dandara Campos',
    'DAVI RIBEIRO': 'Davi Ribeiro',
    'Davi': 'Davi Ribeiro',
    'CAIQUE MENDES': 'Caique Mendes',
    'KAYQUE DO NASCIMENTO SILVA': 'Kayque Nascimento',
    'KAYQUE NASCIMENTO': 'Kayque Nascimento',
    'Cristiano Basilio': 'Cristiano Fernandes',
    'GLAUCO RIBEIRO': 'Glauco Ribeiro',
    'GLAUCO': 'Glauco Ribeiro',
    'GABRIEL SOUZA': 'Gabriel Souza',
    'ISAAC DE SÁ': 'Isaac de Sá',
    'WILLIAM BUENO': 'William Bueno',
    'RENATO RIBEIRO': 'Renato Ribeiro',
    'VICTOR PEREIRA': 'Victor Pereira',
    'VICTOR': 'Victor Pereira',
    'FELIPE GUIMARÃES': 'Felipe Guimarães',
    'BRUNA PACHECO': 'Bruna Pacheco',
    'MARIA CLARA AZEVEDO': 'Maria Clara',
    'Maria Clara Azevedo': 'Maria Clara',
    'EDVAM SILVA': 'Edvan Silva',
    'Edivan Silva': 'Edvan Silva',
    'ADRIEL DUARTE': 'Adriel Duarte',
    'ADRIELDUARTE': 'Adriel Duarte',
    'GERENTE ADRIEL': 'Adriel Duarte',
    'Adriel': 'Adriel Duarte',
    'Marcelo arouca': 'Marcelo Arouca',
    'Marcos Reis': 'Marcos Reis',
    'PEDRO VICTOR': 'NÃO IDENTIFICADO',
    'PEDRO VICTOR SWELL RECREIO': 'NÃO IDENTIFICADO',
    'ELTON MEDEIROS': 'NÃO IDENTIFICADO',
    'LUIS FELIPE': 'NÃO IDENTIFICADO',
    'Renan Filipe': 'NÃO IDENTIFICADO',
    'CARLOS EDUARDO': 'NÃO IDENTIFICADO',
    'THAMIRES DA SILVA DOS SANTOS': 'NÃO IDENTIFICADO',
    'TATIELE BORGES DE ARAUJO': 'NÃO IDENTIFICADO',
    'MARILIA DE LIRA JUSTINO MARTINS': 'NÃO IDENTIFICADO',
    'MONIQUE DE PAULA SILVA': 'NÃO IDENTIFICADO',
    'JOYCE BRISA': 'Joyce Brisa',
    'Cristiane Ferrira': 'Cristiane Ferreira',
    'CRISTIANE FERREIRA': 'Cristiane Ferreira',
    'CRISTIANE FERRIRA': 'Cristiane Ferreira',
    'NATÃ DEODATO': 'NATÃ OLIVEIRA',
    'KAYQUE DO NASCIMENTO': 'Kayque Nascimento',
    'SUZILENE FRANKLIN': 'Suzy Franklyn',
    'DANDARA SILVA': 'Dandara Campos',
    'EDVAN SILVA': 'Edvan Silva',
    'ERICA COLLINS': 'ERICA COLLINS',
    'MARCELO AROUCA': 'Marcelo Arouca',
    'MARCOS REIS': 'Marcos Reis',
    'JOSIMAR MACHADO': 'Josimar Machado',
    'KERLLY MARTINS': 'Kerlly Martins',
    'CAMILA CRAVEIRO': 'Camila Craveiro',
    'CRISTIANO FERNANDES': 'Cristiano Fernandes',
    'GABRIEL RIBEIRO': 'Gabriel Ribeiro',
    'SUZY FRANKLYN': 'Suzy Franklyn',
    'CARLOS AURELIO': 'Carlos Aurelio',
  };

  let corrigidos = 0;
  const detalhes = {};

  // Rodar em Clientes, Registros e Agenda
  const abas = ['Clientes', 'Registros945', 'Agenda'];
  abas.forEach(function(nomeAba) {
    const abaAtual = ss.getSheetByName(nomeAba);
    if (!abaAtual) return;
    const dadosAba = abaAtual.getDataRange().getValues();
    const headerAba = dadosAba[0];
    const col = headerAba.indexOf('CORRETOR');
    if (col === -1) return;

    for (let i = 1; i < dadosAba.length; i++) {
      const atual = String(dadosAba[i][col] || '').trim();
      const correcao = correcoes[atual];
      if (correcao && correcao !== atual) {
        abaAtual.getRange(i + 1, col + 1).setValue(correcao);
        corrigidos++;
        detalhes[atual] = (detalhes[atual] || 0) + 1;
      }
    }
  });

  return { sucesso: true, corrigidos: corrigidos, detalhes: detalhes };
}

// ============================================
// CORRIGIR NOME DE CORRETOR NA ABA CORRETORES
// Busca pelo nome_atual e substitui por nome_correto
// ============================================
function corrigirNomeCorretor(nomeAtual, nomeCorreto) {
  if (!nomeAtual || !nomeCorreto) return { erro: 'Parâmetros nome_atual e nome_correto obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Corretores');
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colNome = header.indexOf('NOME');

  if (colNome === -1) return { erro: 'Coluna NOME não encontrada' };

  let corrigidos = 0;
  for (let i = 1; i < dados.length; i++) {
    const atual = String(dados[i][colNome] || '').trim();
    if (atual === nomeAtual) {
      aba.getRange(i + 1, colNome + 1).setValue(nomeCorreto);
      corrigidos++;
    }
  }

  return { sucesso: true, corrigidos: corrigidos, de: nomeAtual, para: nomeCorreto };
}

// ============================================
// ATUALIZAR CORRETOR (por nome)
// Busca pelo nome e atualiza os campos informados
// ============================================
function atualizarCorretor(nome, campos) {
  if (!nome || !campos) return { erro: 'Parâmetros nome e campos obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Corretores');
  const dados = aba.getDataRange().getValues();
  const header = dados[0].map(c => String(c).trim());
  const colNome = header.indexOf('NOME');

  if (colNome === -1) return { erro: 'Coluna NOME não encontrada' };

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][colNome] || '').trim() === nome) {
      Object.keys(campos).forEach(campo => {
        const colIdx = header.indexOf(campo);
        if (colIdx >= 0) {
          aba.getRange(i + 1, colIdx + 1).setValue(campos[campo]);
        }
      });
      return { sucesso: true, corretor: nome, atualizado: campos };
    }
  }

  return { erro: 'Corretor não encontrado: ' + nome };
}

// ============================================
// CORRIGIR HORÁRIOS DA AGENDA
// Converte horários que o Sheets transformou em Date/número de volta pra texto "HH:MM"
// Ex: 1899-12-30T13:06:28.000Z (que era 10:00) → "10:00"
// ============================================
function atualizarCorretorCliente(cpf, corretor) {
  if (!cpf || !corretor) return { erro: 'CPF e corretor são obrigatórios' };
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  if (!aba) return { erro: 'Aba Clientes não encontrada' };
  const dados = aba.getDataRange().getValues();
  const cab = dados[0].map(c => String(c).trim());
  const colCPF = cab.indexOf('CPF');
  const colCorretor = cab.indexOf('CORRETOR');
  if (colCPF < 0 || colCorretor < 0) return { erro: 'Colunas não encontradas' };
  const cpfLimpo = cpf.replace(/^CPF\s*:?\s*/i, '').trim();
  let corrigidos = 0;
  for (let i = 1; i < dados.length; i++) {
    const cpfPlan = String(dados[i][colCPF]).trim().replace(/^CPF\s*:?\s*/i, '').trim();
    if (cpfPlan === cpfLimpo) {
      aba.getRange(i + 1, colCorretor + 1).setValue(corretor);
      corrigidos++;
    }
  }
  return { sucesso: true, corrigidos: corrigidos, cpf: cpfLimpo, corretor: corretor };
}

function get945Hoje() {
  var ss = SpreadsheetApp.openById(PLANILHA_ID);
  var aba = ss.getSheetByName('Registros945');
  if (!aba) return [];
  var dados = aba.getDataRange().getValues();
  var cab = dados[0].map(function(c) { return String(c).trim(); });
  var colTipo = cab.indexOf('TIPO');
  var colData = cab.indexOf('DATA');
  var colCorretor = cab.indexOf('CORRETOR');
  var colObs = cab.indexOf('OBSERVACOES');
  var hoje = new Date();
  hoje.setHours(hoje.getHours() - 3);
  var hojeStr = hoje.toISOString().substring(0, 10);
  var resultado = [];
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][colTipo]).trim() !== '945-individual') continue;
    var dt = String(dados[i][colData]);
    if (dt.substring(0, 10) !== hojeStr) continue;
    var obs = String(dados[i][colObs] || '').trim();
    if (!obs || obs === '.') continue;
    resultado.push({
      CORRETOR: String(dados[i][colCorretor] || '').trim(),
      OBSERVACOES: obs
    });
  }
  return resultado;
}

function corrigirDatasReprocessamento() {
  var ss = SpreadsheetApp.openById(PLANILHA_ID);
  var aba = ss.getSheetByName('Clientes');
  if (!aba) return { erro: 'Aba Clientes nao encontrada' };
  var dados = aba.getDataRange().getValues();
  var cab = dados[0].map(function(c) { return String(c).trim(); });
  var colCPF = cab.indexOf('CPF');
  var colData = cab.indexOf('DATA CRIAÇÃO');
  if (colData < 0) colData = cab.indexOf('DATA CRIACAO');
  if (colCPF < 0 || colData < 0) return { erro: 'Colunas nao encontradas' };

  // Encontrar clientes com data de 15/07/2026
  var cpfsCorrigir = [];
  for (var i = 1; i < dados.length; i++) {
    var dataStr = String(dados[i][colData]);
    if (dataStr.indexOf('2026-07-15') >= 0 || dataStr.indexOf('Jul 15') >= 0 || dataStr.indexOf('15/07/2026') >= 0) {
      var cpf = String(dados[i][colCPF]).trim().replace(/^CPF\s*:?\s*/i, '').trim();
      if (cpf) cpfsCorrigir.push({ linha: i + 1, cpf: cpf });
    }
  }

  if (cpfsCorrigir.length === 0) return { sucesso: true, corrigidos: 0, msg: 'Nenhum cliente com data 15/07' };

  // Buscar emails no Gmail pra cada CPF e pegar a data real
  var corrigidos = 0;
  var erros = [];
  cpfsCorrigir.forEach(function(item) {
    try {
      var cpfBusca = item.cpf.replace(/[.\-]/g, '');
      var threads = GmailApp.search('subject:' + cpfBusca + ' subject:ANALISE', 0, 1);
      if (threads.length === 0) {
        threads = GmailApp.search(item.cpf, 0, 1);
      }
      if (threads.length > 0) {
        var dataReal = threads[0].getMessages()[0].getDate();
        aba.getRange(item.linha, colData + 1).setValue(dataReal);
        corrigidos++;
      } else {
        erros.push(item.cpf);
      }
    } catch(e) {
      erros.push(item.cpf + ': ' + e.message);
    }
  });

  return { sucesso: true, total: cpfsCorrigir.length, corrigidos: corrigidos, naoEncontrados: erros };
}

function corrigirHorariosAgenda() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Agenda');
  const dados = aba.getDataRange().getValues();
  const header = dados[0].map(c => String(c).trim());
  const colHora = header.indexOf('HORA');

  if (colHora === -1) return { erro: 'Coluna HORA não encontrada' };

  let corrigidos = 0;
  const detalhes = [];

  for (let i = 1; i < dados.length; i++) {
    const val = dados[i][colHora];
    if (!val) continue;

    // Se já é string no formato HH:MM, pular
    if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val.trim())) continue;

    // Se é Date (Sheets converteu pra objeto Date)
    let horaCorreta = null;
    if (val instanceof Date) {
      // O Sheets armazena hora como fração de dia baseado em 1899-12-30
      // Precisamos extrair hora:minuto do valor do Sheets, não do UTC
      // O getHours/getMinutes retorna no timezone local — usar formatação do Sheets
      const h = val.getHours();
      const m = val.getMinutes();
      horaCorreta = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    } else if (typeof val === 'number') {
      // Número fracionário (fração do dia): 0.4166... = 10:00
      const totalMinutos = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutos / 60);
      const m = totalMinutos % 60;
      horaCorreta = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    if (horaCorreta) {
      const celula = aba.getRange(i + 1, colHora + 1);
      celula.setNumberFormat('@'); // formato texto
      celula.setValue(horaCorreta);
      detalhes.push({ linha: i + 1, de: String(val), para: horaCorreta });
      corrigidos++;
    }
  }

  return { sucesso: true, corrigidos: corrigidos, detalhes: detalhes };
}

// ============================================
// CORRIGIR HORÁRIOS NA ABA REGISTROS945
// Mesma lógica da Agenda: converter Date/número pra texto "HH:MM"
// ============================================
function corrigirHorariosRegistros() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Registros945');
  const dados = aba.getDataRange().getValues();
  const header = dados[0].map(c => String(c).trim());
  const colHora = header.indexOf('HORA');

  if (colHora === -1) return { erro: 'Coluna HORA não encontrada' };

  let corrigidos = 0;

  for (let i = 1; i < dados.length; i++) {
    const val = dados[i][colHora];
    if (!val) continue;
    if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val.trim())) continue;

    let horaCorreta = null;
    if (val instanceof Date) {
      const h = val.getHours();
      const m = val.getMinutes();
      horaCorreta = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    } else if (typeof val === 'number') {
      const totalMinutos = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutos / 60);
      const m = totalMinutos % 60;
      horaCorreta = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    if (horaCorreta) {
      const celula = aba.getRange(i + 1, colHora + 1);
      celula.setNumberFormat('@');
      celula.setValue(horaCorreta);
      corrigidos++;
    }
  }

  return { sucesso: true, corrigidos: corrigidos };
}

// ============================================
// REPROCESSAR EMAILS DE UM CORRETOR
// Busca no Gmail por emails de/para um remetente específico
// Encontra clientes (ANÁLISE no assunto) e corrige o corretor na aba Clientes
// ============================================
function reprocessarEmailsCorretor(emailFrom, nomeCorretor) {
  if (!emailFrom || !nomeCorretor) return { erro: 'Parâmetros email_from e nome_corretor obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const abaClientes = ss.getSheetByName('Clientes');
  const dados = abaClientes.getDataRange().getValues();
  const header = dados[0];
  const colCorretor = header.indexOf('CORRETOR');
  const colCliente = header.indexOf('CLIENTE');
  const colCPF = header.indexOf('CPF');

  // Buscar emails no Gmail
  const buscas = [
    'from:' + emailFrom + ' subject:ANÁLISE after:2026/01/01',
    'from:' + emailFrom + ' subject:ANALISE after:2026/01/01',
  ];

  const ids = new Set();
  const threads = [];
  buscas.forEach(q => {
    GmailApp.search(q, 0, 100).forEach(t => {
      if (!ids.has(t.getId())) { ids.add(t.getId()); threads.push(t); }
    });
  });

  let corrigidos = 0;
  let novos = 0;
  const clientesEncontrados = [];

  threads.forEach(thread => {
    try {
      const assunto = thread.getFirstMessageSubject();
      if (!assunto.toUpperCase().includes('ANÁLISE') && !assunto.toUpperCase().includes('ANALISE')) return;

      // Extrair nome e CPF do assunto
      const partes = assunto.split(/\s*-\s*/);
      let nomeCliente = '';
      let cpfCliente = '';

      for (let i = 0; i < partes.length; i++) {
        const limpo = partes[i].replace(/\s+/g, '').replace(/[.\-]/g, '');
        if (/^\d{11}$/.test(limpo)) {
          cpfCliente = partes[i].trim();
          nomeCliente = partes.slice(1, i).join(' ').replace(/CPF/i, '').trim();
          break;
        }
      }

      if (!nomeCliente) return;

      clientesEncontrados.push({ nome: nomeCliente, cpf: cpfCliente });

      // Procurar na planilha por CPF ou nome
      let encontrou = false;
      const cpfLimpo = cpfCliente.replace(/[.\-\s]/g, '');

      for (let i = 1; i < dados.length; i++) {
        const cpfPlanilha = String(dados[i][colCPF] || '').replace(/[.\-\s]/g, '');
        const nomePlanilha = String(dados[i][colCliente] || '').toUpperCase();

        if ((cpfLimpo && cpfPlanilha === cpfLimpo) || nomePlanilha.includes(nomeCliente.toUpperCase())) {
          // Corrigir o corretor
          const corretorAtual = String(dados[i][colCorretor] || '');
          if (corretorAtual !== nomeCorretor) {
            abaClientes.getRange(i + 1, colCorretor + 1).setValue(nomeCorretor);
            corrigidos++;
          }
          encontrou = true;
          break;
        }
      }

      // Se não encontrou, inserir novo
      if (!encontrou) {
        // Extrair dados do corpo
        let renda = null;
        let status = 'PENDENTE';
        let valor = null;
        let regiao = '';

        const mensagens = thread.getMessages();
        const dataEmail = mensagens[0].getDate(); // Data real do email
        mensagens.forEach(msg => {
          const corpo = msg.getPlainBody();
          const rendaMatch = corpo.match(/RENDA:\s*R?\$?\s*([\d.,]+)/i);
          if (rendaMatch) renda = parseFloat(rendaMatch[1].replace(/\./g, '').replace(',', '.'));
          const statusMatch = corpo.match(/STATUS:\s*(.+)/i);
          if (statusMatch) status = statusMatch[1].trim().toUpperCase();
          const valorMatch = corpo.match(/VALOR:\s*R?\$?\s*([\d.,]+)/i);
          if (valorMatch) valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
          const regiaoMatch = corpo.match(/REGI[ÃA]O:\s*(.+)/i);
          if (regiaoMatch) regiao = regiaoMatch[1].trim();
        });

        const faixa = renda ? (renda <= 2500 ? 'Faixa 1' : renda <= 6000 ? 'Faixa 2' : renda <= 13000 ? 'Faixa 3' : 'Acima Faixa 3') : '';
        const teto = renda ? (renda <= 2500 ? 215000 : renda <= 6000 ? 300000 : renda <= 13000 ? 500000 : '') : '';

        abaClientes.appendRow([
          nomeCorretor,
          nomeCliente,
          cpfCliente,
          renda || '',
          status,
          valor || '',
          faixa,
          teto,
          regiao,
          dataEmail,
          dataEmail
        ]);
        novos++;
      }
    } catch(e) {}
  });

  return {
    sucesso: true,
    emails_encontrados: threads.length,
    corrigidos: corrigidos,
    novos_inseridos: novos,
    clientes: clientesEncontrados.map(c => c.nome)
  };
}

// ============================================
// TRIGGER - CONFIGURAR PROCESSAMENTO AUTOMÁTICO
// Rodar UMA VEZ para ativar
// ============================================
function configurarTrigger945() {
  // Remove triggers antigos desta função
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processarNovas945') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Roda todo dia às 10h (horário de Brasília)
  ScriptApp.newTrigger('processarNovas945')
    .timeBased()
    .atHour(10)
    .everyDays(1)
    .inTimezone('America/Sao_Paulo')
    .create();

  Logger.log('Trigger 945 configurado! Vai processar gravações todo dia às 10h.');
}

// ============================================
// IMPORTAR EMAILS - RODA A CADA 1 HORA
// Pega TODOS os emails de/para analise.vipcred
// Só insere se CPF não existe na planilha
// ============================================
function importarEmails() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  if (!aba) return;

  // Carregar CPFs existentes — buscar coluna pelo cabeçalho
  const dados = aba.getDataRange().getValues();
  const cabCli = dados[0].map(c => String(c).trim());
  const colCPFIdx = cabCli.indexOf('CPF');
  if (colCPFIdx < 0) return;

  const cpfsExistentes = {};
  for (let i = 1; i < dados.length; i++) {
    const cpf = String(dados[i][colCPFIdx]).replace(/[^0-9.\-]/g, '').trim();
    if (cpf) cpfsExistentes[cpf] = true;
  }

  // Buscar emails de/para analise.vipcred — excluir já processados por ambos os scripts
  const buscas = [
    'to:analise.vipcred@swellimobiliaria.com -label:ALICERCE-IMPORTADO -label:VIPCRED-PROCESSADO after:2026/01/01',
    'from:analise.vipcred@swellimobiliaria.com -label:ALICERCE-IMPORTADO -label:VIPCRED-PROCESSADO after:2026/01/01',
  ];

  let labelImportado = GmailApp.getUserLabelByName('ALICERCE-IMPORTADO');
  if (!labelImportado) labelImportado = GmailApp.createLabel('ALICERCE-IMPORTADO');

  const ids = {};
  const threads = [];
  buscas.forEach(q => {
    GmailApp.search(q, 0, 50).forEach(t => {
      if (!ids[t.getId()]) { ids[t.getId()] = true; threads.push(t); }
    });
  });

  let inseridos = 0;

  threads.forEach(thread => {
    try {
      const assunto = thread.getFirstMessageSubject() || '';

      // Extrair CPF do assunto
      const cpfMatch = assunto.match(/(\d{3}\.\d{3}\.\d{3})/);
      if (!cpfMatch) { thread.addLabel(labelImportado); return; }

      let cpf = cpfMatch[0];
      // Completar com os 2 dígitos finais
      const partes = assunto.split('-').map(p => p.trim());
      for (let i = 0; i < partes.length; i++) {
        if (partes[i].includes(cpf) && i + 1 < partes.length) {
          const prox = partes[i+1].trim();
          if (prox.length >= 2 && /^\d{2}/.test(prox)) {
            cpf = cpf + '-' + prox.substring(0, 2);
            break;
          }
        }
      }
      if (!cpf.includes('-')) {
        const cpfFull = assunto.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
        if (cpfFull) cpf = cpfFull[1];
      }

      const cpfLimpo = cpf.replace(/[^0-9.\-]/g, '').trim();
      if (cpfsExistentes[cpfLimpo]) { thread.addLabel(labelImportado); return; }

      // Extrair nome do assunto
      const upper = assunto.toUpperCase();
      let nome = '';
      if (upper.includes('ANÁLISE') || upper.includes('ANALISE')) {
        const ps = assunto.split(/[-:]/).map(p => p.trim());
        for (let i = 1; i < ps.length; i++) {
          if (ps[i].match(/\d{3}\.\d{3}/)) break;
          const limpo = ps[i].replace(/^(CPF\s*:?\s*)/i, '').trim();
          if (limpo.length > 2 && !limpo.match(/^\d/)) {
            nome = (nome ? nome + ' ' : '') + limpo;
          }
        }
      }
      if (!nome) nome = 'NOME NÃO EXTRAÍDO';

      // Identificar corretor pelo remetente
      let corretor = 'NÃO IDENTIFICADO';
      const mensagens = thread.getMessages();
      const de = mensagens[0].getFrom().toLowerCase();

      // CAMADA 1: Buscar pelo email cadastrado na planilha Corretores
      const abaCorr = ss.getSheetByName('Corretores');
      if (abaCorr) {
        const dadosCorr = abaCorr.getDataRange().getValues();
        const cabCorr = dadosCorr[0].map(c => String(c).trim().toUpperCase());
        const colEmail = cabCorr.indexOf('EMAIL');
        const colNome = cabCorr.indexOf('NOME');
        if (colEmail >= 0 && colNome >= 0) {
          for (let j = 1; j < dadosCorr.length; j++) {
            const emailCorr = String(dadosCorr[j][colEmail] || '').toLowerCase().trim();
            const nomeCorr = String(dadosCorr[j][colNome] || '').trim();
            if (emailCorr && de.includes(emailCorr)) {
              corretor = nomeCorr;
              break;
            }
          }
        }
      }

      // CAMADA 2: Se não encontrou pelo email, tenta pelo nome no remetente
      if (corretor === 'NÃO IDENTIFICADO') {
        const corrMap = {
          'marceloarouca': 'Marcelo Arouca', 'dandara': 'Dandara Campos',
          'william': 'William Bueno', 'kayque': 'Kayque Nascimento',
          'bruna': 'Bruna Pacheco', 'davi': 'Davi Ribeiro',
          'renato': 'Renato Ribeiro', 'victor': 'Victor Pereira',
          'gabriel': 'Gabriel', 'cristiano': 'Cristiano Fernandes',
          'camila': 'Camila Craveiro', 'joyce': 'Joyce Brisa',
          'cristiane': 'Cristiane', 'isaac': 'Isaac de Sá',
          'maria': 'Maria Clara', 'edivan': 'Edivan Silva',
          'marcos': 'Marcos Reis', 'glauco': 'Glauco Ribeiro',
          'caique': 'Caique Mendes', 'felipe': 'Felipe Guimarães'
        };
        for (const [chave, nome_corr] of Object.entries(corrMap)) {
          if (de.includes(chave)) { corretor = nome_corr; break; }
        }
      }

      // Inserir cliente
      aba.appendRow([
        corretor, nome, cpfLimpo, '', 'PENDENTE', '', '', '', '', new Date(), new Date()
      ]);
      cpfsExistentes[cpfLimpo] = true;
      inseridos++;

      thread.addLabel(labelImportado);
    } catch(e) {
      Logger.log('Erro: ' + e.message);
    }
  });

  Logger.log('Importação: ' + inseridos + ' novos clientes de ' + threads.length + ' emails.');
}

// ============================================
// IMPORTAÇÃO INTELIGENTE - verifica horário antes de rodar
// Se 8h-19h: roda (chamado a cada 30min pelo trigger)
// Se 19h-8h: roda só a cada 6h (pula execuções intermediárias)
// ============================================
function importarEmailsInteligente() {
  const agora = new Date();
  const hora = agora.getHours();

  if (hora >= 8 && hora < 19) {
    // Horário comercial: roda sempre (a cada 30min)
    importarEmails();
  } else {
    // Fora do expediente: roda só 1x por janela (22h-23h e 4h-5h)
    if ((hora >= 22 && hora < 23) || (hora >= 4 && hora < 5)) {
      // Verificar se já rodou nesta janela (evita rodar 2x com trigger de 30min)
      const props = PropertiesService.getScriptProperties();
      const chave = 'ultima_import_fora_' + hora;
      const hoje = agora.toISOString().substring(0, 10);
      if (props.getProperty(chave) === hoje) return; // já rodou nesta janela hoje
      props.setProperty(chave, hoje);
      importarEmails();
    }
    // Nas outras horas fora do expediente, não faz nada (economiza cota)
  }
}

// ============================================
// TRIGGER - CONFIGURAR IMPORTAÇÃO INTELIGENTE
// Rodar UMA VEZ para ativar
// ============================================
function configurarTriggerEmails() {
  // Remove triggers antigos
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'importarEmails' || t.getHandlerFunction() === 'importarEmailsInteligente') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Roda a cada 30 minutos (a função decide se executa ou pula)
  ScriptApp.newTrigger('importarEmailsInteligente')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('Trigger inteligente configurado! 8h-19h: a cada 30min | 19h-8h: só 22h e 4h');
}

// ============================================
// SINCRONIZAR VENDAS DO EXCEL (OneDrive) → Google Sheets
// ============================================
function sincronizarVendas() {
  const ONEDRIVE_URL = 'https://api.onedrive.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8yMDA0MDVERThBODcxNEU4L0lRRFhTWlA5RDFVMlFhQktpUFBWZTZDb0FaX0Rsb0VlcHNjNEsxTldVYlRYSHBF/root/content';

  try {
    // Baixar Excel do OneDrive
    const resp = UrlFetchApp.fetch(ONEDRIVE_URL, { followRedirects: true, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) {
      Logger.log('Erro ao baixar Excel: ' + resp.getResponseCode());
      return;
    }

    const blob = resp.getBlob();
    blob.setName('vendas-temp.xlsx');

    // Converter Excel pra Google Sheets temporária
    const tempFile = Drive.Files.insert(
      { title: 'vendas-temp-import', mimeType: 'application/vnd.google-apps.spreadsheet' },
      blob,
      { convert: true }
    );

    // Ler dados da planilha temporária
    const tempSS = SpreadsheetApp.openById(tempFile.id);
    const tempAba = tempSS.getSheets()[0]; // primeira aba = Planilha de Vendas
    const dados = tempAba.getDataRange().getValues();

    // Encontrar cabeçalho (linha com "MÊS", "DATA DA VENDA", etc.)
    let linhaHeader = -1;
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i].map(c => String(c).trim().toUpperCase());
      if (linha.includes('MÊS') || linha.includes('CLIENTE')) {
        linhaHeader = i;
        break;
      }
    }

    if (linhaHeader < 0) {
      Logger.log('Cabeçalho não encontrado no Excel');
      DriveApp.getFileById(tempFile.id).setTrashed(true);
      return;
    }

    // Mapear colunas
    const header = dados[linhaHeader].map(c => String(c).trim().toUpperCase());
    const colMap = {
      'MES_COMERCIAL': header.indexOf('MÊS') >= 0 ? header.indexOf('MÊS') : header.indexOf('MES'),
      'DATA_VENDA': header.indexOf('DATA DA VENDA'),
      'CLIENTE': header.indexOf('CLIENTE'),
      'CPF': header.indexOf('CPF CLIENTE') >= 0 ? header.indexOf('CPF CLIENTE') : header.indexOf('CPF'),
      'STATUS_VENDA': header.indexOf('STATUS DA VENDA') >= 0 ? header.indexOf('STATUS DA VENDA') : header.indexOf('STATUS'),
      'EMPREENDIMENTO': header.indexOf('EMPREENDIMENTO'),
      'CONSTRUTORA': header.indexOf('CONSTRUTORA'),
      'VGV': header.indexOf('VGV'),
      'COORDENADOR': header.indexOf('COORDENADOR'),
      'CORRETOR': header.indexOf('CORRETOR') >= 0 ? header.indexOf('CORRETOR') : header.indexOf('CORRETOR '),
      'DATA_REPASSE': header.indexOf('DATA DO                            REPASSE') >= 0 ? header.indexOf('DATA DO                            REPASSE') : header.indexOf('DATA DO REPASSE'),
      'CCA': header.indexOf('CCA')
    };

    // Tentar achar coluna CORRETOR com espaço
    if (colMap['CORRETOR'] < 0) {
      for (let i = 0; i < header.length; i++) {
        if (header[i].startsWith('CORRETOR')) { colMap['CORRETOR'] = i; break; }
      }
    }

    // Extrair vendas válidas
    const vendas = [];
    const cabFinal = ['MES_COMERCIAL', 'DATA_VENDA', 'CLIENTE', 'CPF', 'STATUS_VENDA', 'EMPREENDIMENTO', 'CONSTRUTORA', 'VGV', 'COORDENADOR', 'CORRETOR', 'DATA_REPASSE', 'CCA'];

    for (let i = linhaHeader + 1; i < dados.length; i++) {
      const cliente = colMap['CLIENTE'] >= 0 ? String(dados[i][colMap['CLIENTE']] || '').trim() : '';
      if (!cliente) continue; // pular linhas vazias

      const row = cabFinal.map(col => {
        const idx = colMap[col];
        if (idx < 0) return '';
        const val = dados[i][idx];
        if (val instanceof Date) return val.toISOString().substring(0, 10);
        return val !== null && val !== undefined ? val : '';
      });

      vendas.push(row);
    }

    // Atualizar aba Vendas na planilha Alicerce
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    let abaVendas = ss.getSheetByName('Vendas');
    if (!abaVendas) {
      abaVendas = ss.insertSheet('Vendas');
    }

    // Limpar aba e escrever dados novos
    abaVendas.clear();
    abaVendas.getRange(1, 1, 1, cabFinal.length).setValues([cabFinal]);
    if (vendas.length > 0) {
      abaVendas.getRange(2, 1, vendas.length, cabFinal.length).setValues(vendas);
    }

    // Formatar cabeçalho
    abaVendas.getRange('1:1').setFontWeight('bold').setBackground('#1a2332').setFontColor('#64ffda');
    abaVendas.setFrozenRows(1);

    // Deletar arquivo temporário
    DriveApp.getFileById(tempFile.id).setTrashed(true);

    Logger.log('Vendas sincronizadas: ' + vendas.length + ' registros');
  } catch(e) {
    Logger.log('Erro sincronização vendas: ' + e.message);
  }
}

// ============================================
// TRIGGER - CONFIGURAR SINCRONIZAÇÃO DE VENDAS
// Rodar UMA VEZ para ativar
// ============================================
function configurarTriggerVendas() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sincronizarVendas') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Roda todo dia às 8h (antes do expediente)
  ScriptApp.newTrigger('sincronizarVendas')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .inTimezone('America/Sao_Paulo')
    .create();

  Logger.log('Trigger vendas configurado! Sincroniza todo dia às 8h.');
}

// ============================================
// ============================================
// WHATSAPP — RELATÓRIO DE PRESENÇA PARA COORDENADORES
// Requer Z-API (z-api.io) — configurar ZAPI_INSTANCE e ZAPI_TOKEN
// Trigger: rodar diariamente às 11h (configurarTriggerWhatsApp)
// ============================================
const ZAPI_INSTANCE = ''; // Preencher com ID da instância Z-API
const ZAPI_TOKEN = '';    // Preencher com token da Z-API

const COORDENADORES_WHATSAPP = {
  'Glauco': { tel: '', membros: ['Dandara Campos','Isaac de Sá','Davi Ribeiro','William Bueno','Victor Pereira','Gabriel Souza','Natã Oliveira'] },
  'Edvan': { tel: '', membros: ['Gabriel Ribeiro','Cristiano Fernandes','Camila Craveiro','Bruna Pacheco','Maria Clara','Kerlly Martins','Suzy Franklyn'] },
  'Marcelo Arouca': { tel: '', membros: ['Cristiane Ferreira','Felipe Guimarães','Carlos Aurelio'] },
  'Adriel': { tel: '', membros: [] } // Adriel recebe resumo geral
};

function enviarRelatorioPresenca() {
  if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
    Logger.log('Z-API não configurada. Preencher ZAPI_INSTANCE e ZAPI_TOKEN.');
    return;
  }

  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const registros = lerAba('Registros945');

  const checkinsHoje = registros.filter(r => String(r.DATA || '').substring(0, 10) === hoje && String(r.TIPO || '').toLowerCase() === 'checkin');
  const n945Hoje = registros.filter(r => String(r.DATA || '').substring(0, 10) === hoje && String(r.TIPO || '') === '945-individual');

  const checkinNomes = checkinsHoje.map(c => normNomeGS(c.CORRETOR));
  const n945Nomes = n945Hoje.map(n => normNomeGS(n.CORRETOR));

  function nomeMatchGS(membro) {
    const nm = normNomeGS(membro);
    return { checkin: checkinNomes.some(n => n === nm || n.indexOf(nm) >= 0 || nm.indexOf(n) >= 0),
             n945: n945Nomes.some(n => n === nm || n.indexOf(nm) >= 0 || nm.indexOf(n) >= 0) };
  }

  // Para cada coordenador
  Object.keys(COORDENADORES_WHATSAPP).forEach(coord => {
    const cfg = COORDENADORES_WHATSAPP[coord];
    if (!cfg.tel) return;

    let membros = cfg.membros;
    // Adriel recebe todos
    if (coord === 'Adriel') {
      membros = [];
      Object.values(COORDENADORES_WHATSAPP).forEach(c => { membros = membros.concat(c.membros); });
    }

    const semCheckin = membros.filter(m => !nomeMatchGS(m).checkin);
    const sem945 = membros.filter(m => !nomeMatchGS(m).n945);
    const semNada = membros.filter(m => { const r = nomeMatchGS(m); return !r.checkin && !r.n945; });

    let msg = `📋 *ALICERCE — Presença ${hoje}*\n\n`;
    msg += `✅ Check-in: ${membros.length - semCheckin.length}/${membros.length}\n`;
    msg += `✅ 945: ${membros.length - sem945.length}/${membros.length}\n\n`;

    if (semNada.length > 0) {
      msg += `❌ *Não fizeram NADA:*\n`;
      semNada.forEach(m => { msg += `  • ${m}\n`; });
      msg += '\n';
    }

    if (semCheckin.length > 0 && semCheckin.length !== semNada.length) {
      const soCheckin = semCheckin.filter(m => !semNada.includes(m));
      if (soCheckin.length > 0) {
        msg += `⚠️ *Sem check-in (mas fez 945):*\n`;
        soCheckin.forEach(m => { msg += `  • ${m}\n`; });
        msg += '\n';
      }
    }

    if (sem945.length > 0 && sem945.length !== semNada.length) {
      const so945 = sem945.filter(m => !semNada.includes(m));
      if (so945.length > 0) {
        msg += `⚠️ *Sem 945 (mas fez check-in):*\n`;
        so945.forEach(m => { msg += `  • ${m}\n`; });
      }
    }

    if (semNada.length === 0 && semCheckin.length === 0) {
      msg += `🎉 *Todos presentes!*`;
    }

    enviarWhatsApp(cfg.tel, msg);
  });
}

function enviarWhatsApp(telefone, mensagem) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
  const payload = { phone: telefone, message: mensagem };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log('WhatsApp enviado para ' + telefone + ': ' + res.getResponseCode());
  } catch(e) {
    Logger.log('Erro WhatsApp: ' + e.message);
  }
}

function normNomeGS(n) {
  return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function configurarTriggerWhatsApp() {
  // Remove triggers antigos
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'enviarRelatorioPresenca') ScriptApp.deleteTrigger(t);
  });
  // Todo dia às 11h
  ScriptApp.newTrigger('enviarRelatorioPresenca')
    .timeBased()
    .atHour(11)
    .everyDays(1)
    .inTimezone('America/Sao_Paulo')
    .create();
  Logger.log('Trigger WhatsApp configurado para 11h diário');
}

// ============================================
// ============================================
// CORRIGIR CORRETORA — busca emails com CORRETORA: no corpo e corrige na planilha
// ============================================
function corrigirCorretora(nomeCorretor) {
  if (!nomeCorretor) return { erro: 'nome_corretor obrigatório' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Clientes');
  const dados = aba.getDataRange().getValues();
  const header = dados[0].map(c => String(c).trim());
  const colCorretor = header.indexOf('CORRETOR');
  const colCliente = header.indexOf('CLIENTE');
  const colCPF = header.indexOf('CPF');

  // Buscar no Gmail emails da VipCrédito com CORRETORA no corpo
  const threads = GmailApp.search('subject:ANÁLISE CORRETORA after:2026/01/01', 0, 200);

  let corrigidos = 0;
  const detalhes = [];

  threads.forEach(t => {
    t.getMessages().forEach(msg => {
      const corpo = msg.getPlainBody() || '';
      const corretorMatch = corpo.match(/CORRETORA?:\s*(.+)/i);
      if (!corretorMatch) return;

      const corretorEmail = corretorMatch[1].trim().toUpperCase();
      if (!corretorEmail.includes(nomeCorretor.toUpperCase().split(' ')[0])) return;

      // Encontrar CPF no assunto ou corpo
      const assunto = msg.getSubject() || '';
      const cpfMatch = (assunto + ' ' + corpo).match(/\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}/);
      if (!cpfMatch) return;
      const cpfLimpo = cpfMatch[0].replace(/[^0-9]/g, '');

      // Buscar na planilha e corrigir
      for (let i = 1; i < dados.length; i++) {
        const cpfPlanilha = String(dados[i][colCPF] || '').replace(/[^0-9]/g, '');
        if (cpfPlanilha === cpfLimpo && dados[i][colCorretor] === 'NÃO IDENTIFICADO') {
          aba.getRange(i + 1, colCorretor + 1).setValue(nomeCorretor);
          detalhes.push({ cliente: dados[i][colCliente], cpf: cpfMatch[0] });
          corrigidos++;
          break;
        }
      }
    });
  });

  return { sucesso: true, corrigidos: corrigidos, detalhes: detalhes };
}

// ============================================
// TESTE
// ============================================
function testeAPI() {
  const dados = lerAba('Corretores');
  Logger.log('Corretores: ' + dados.length);
  Logger.log(JSON.stringify(dados[0]));

  const clientes = lerAba('Clientes');
  Logger.log('Clientes: ' + clientes.length);
}

// ============================================
// ATUALIZAR REAL — atualiza cliente no pipeline quente
// ============================================
function atualizarReal(busca, campos) {
  if (!busca || !campos) return { erro: 'Busca e campos obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Real');
  if (!aba) return { erro: 'Aba Real não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0].map(c => String(c).trim());

  for (let i = 1; i < dados.length; i++) {
    let match = true;
    Object.keys(busca).forEach(campo => {
      const colIdx = cabecalho.indexOf(campo);
      if (colIdx < 0) { match = false; return; }
      const valorPlanilha = String(dados[i][colIdx] instanceof Date ? dados[i][colIdx].toISOString().substring(0, 10) : (dados[i][colIdx] || '')).trim();
      const valorBusca = String(busca[campo] || '').trim();
      if (valorPlanilha.toUpperCase() !== valorBusca.toUpperCase()) match = false;
    });

    if (match) {
      Object.keys(campos).forEach(campo => {
        const colIdx = cabecalho.indexOf(campo);
        if (colIdx >= 0) {
          aba.getRange(i + 1, colIdx + 1).setValue(campos[campo]);
        }
      });
      return { sucesso: true, linha: i + 1 };
    }
  }

  return { erro: 'Cliente não encontrado na aba Real' };
}

// ============================================
// DELETAR REAL — remove cliente do pipeline quente
// ============================================
function deletarReal(corretor, cliente) {
  if (!corretor || !cliente) return { erro: 'Corretor e cliente obrigatórios' };

  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Real');
  if (!aba) return { erro: 'Aba Real não encontrada' };

  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0].map(c => String(c).trim());
  const colCorretor = cabecalho.indexOf('CORRETOR');
  const colCliente = cabecalho.indexOf('CLIENTE');

  if (colCorretor < 0 || colCliente < 0) return { erro: 'Colunas CORRETOR/CLIENTE não encontradas' };

  for (let i = dados.length - 1; i >= 1; i--) {
    const corretorPlanilha = String(dados[i][colCorretor] || '').trim().toUpperCase();
    const clientePlanilha = String(dados[i][colCliente] || '').trim().toUpperCase();
    if (corretorPlanilha === corretor.trim().toUpperCase() && clientePlanilha === cliente.trim().toUpperCase()) {
      aba.deleteRow(i + 1);
      return { sucesso: true, removido: cliente };
    }
  }

  return { erro: 'Cliente não encontrado para remoção' };
}

// ============================================
// SALVAR FOTO DE ATENDIMENTO NO GOOGLE DRIVE
// Corretor envia foto como prova de atendimento
// ============================================
function salvarFotoAtendimento(dados) {
  try {
    const { corretor, cliente, data, hora, local, gps, foto } = dados;
    if (!foto || !corretor || !cliente) return { erro: 'Dados incompletos' };

    // Criar/encontrar pasta no Drive
    const nomePasta = 'ATENDIMENTOS_FOTOS';
    let pasta;
    const pastas = DriveApp.getFoldersByName(nomePasta);
    if (pastas.hasNext()) {
      pasta = pastas.next();
    } else {
      pasta = DriveApp.createFolder(nomePasta);
    }

    // Criar subpasta do mês (ex: 2026-10)
    const mesAtual = (data || new Date().toISOString().substring(0, 10)).substring(0, 7);
    let subpasta;
    const subs = pasta.getFoldersByName(mesAtual);
    if (subs.hasNext()) {
      subpasta = subs.next();
    } else {
      subpasta = pasta.createFolder(mesAtual);
    }

    // Salvar foto
    const nomeArquivo = corretor.replace(/\s+/g, '_') + '_' + (cliente || 'cliente').replace(/\s+/g, '_') + '_' + (data || 'sem-data') + '_' + (hora || '').replace(':', 'h') + '.jpg';
    const blob = Utilities.newBlob(Utilities.base64Decode(foto), 'image/jpeg', nomeArquivo);
    const arquivo = subpasta.createFile(blob);

    // Log
    const ss = SpreadsheetApp.openById('1GKiSoslU8H9O3fVYgYXVEGjmsJcKPpLldbmxYZXN9I8');
    const abaLog = ss.getSheetByName('Log');
    if (abaLog) {
      abaLog.appendRow([new Date(), corretor, cliente, 'FOTO-ATENDIMENTO', local || '', gps || '', data || '', hora || '', arquivo.getUrl(), 'APP-CORRETOR']);
    }

    return { sucesso: true, arquivo: arquivo.getUrl(), nome: nomeArquivo };
  } catch(e) {
    return { erro: e.message };
  }
}

// ============================================
// SYNC SWELL — Puxa vendas do portal automaticamente
// ============================================
function sincronizarVendasSwell() {
  const EMAIL_SWELL = 'swell.adriel@gmail.com';
  const SENHA_SWELL = '29071998*Aj';
  const ACTION_ID = '60bc76ace87e3d4436a5ac54c7b1e5ea397be9ff08';

  try {
    // Passo 1: Login no portal Swell
    const boundary = '----FormBoundary7MA';
    const loginBody = [
      '------FormBoundary7MA\r\nContent-Disposition: form-data; name="1_$ACTION_ID_' + ACTION_ID + '"\r\n\r\n',
      '------FormBoundary7MA\r\nContent-Disposition: form-data; name="0"\r\n\r\n[{"email":"' + EMAIL_SWELL + '","senha":"' + SENHA_SWELL + '"},{"portal":true}]',
      '------FormBoundary7MA--\r\n'
    ].join('\r\n');

    const loginResp = UrlFetchApp.fetch('https://swellimobiliaria.com/portal/login', {
      method: 'post',
      contentType: 'multipart/form-data; boundary=----FormBoundary7MA',
      payload: loginBody,
      headers: {
        'Next-Action': ACTION_ID,
        'Accept': 'text/x-component',
        'User-Agent': 'Mozilla/5.0'
      },
      followRedirects: false,
      muteHttpExceptions: true
    });

    // Extrair cookie de sessao
    const setCookies = loginResp.getAllHeaders()['Set-Cookie'] || loginResp.getAllHeaders()['set-cookie'] || [];
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies])
      .map(c => c.split(';')[0])
      .filter(c => c.includes('sb-') || c.includes('auth'))
      .join('; ');

    if (!cookies) {
      Logger.log('ERRO: Login falhou — sem cookie de sessao');
      return { erro: 'Login falhou' };
    }
    Logger.log('Login OK. Cookie: ' + cookies.substring(0, 80) + '...');

    // Passo 2: Buscar pagina de vendas autenticado
    const vendasResp = UrlFetchApp.fetch('https://swellimobiliaria.com/portal/vendas', {
      method: 'get',
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0'
      },
      muteHttpExceptions: true
    });

    const html = vendasResp.getContentText();
    Logger.log('Pagina vendas: ' + html.length + ' chars');

    // Passo 3: Extrair JSON de vendas do RSC payload
    // Os dados vem escapados dentro de self.__next_f.push([1,"..."])
    // Entao "rows" aparece como \"rows\" no HTML bruto
    // Tentar ambos os formatos
    let startMarker = '"rows":[{';
    let startIdx = html.indexOf(startMarker);
    let escaped = false;

    if (startIdx === -1) {
      // Tentar formato escapado
      startMarker = '\\"rows\\":[{';
      startIdx = html.indexOf(startMarker);
      if (startIdx === -1) {
        startMarker = '\\u0022rows\\u0022:[{';
        startIdx = html.indexOf(startMarker);
      }
      if (startIdx !== -1) escaped = true;
    }

    if (startIdx === -1) {
      // Debug: mostrar trecho onde "rows" aparece
      const ri = html.indexOf('rows');
      Logger.log('ERRO: Nao encontrou rows. indexOf("rows")=' + ri);
      if (ri > -1) Logger.log('Contexto: ' + html.substring(ri - 20, ri + 100));
      return { erro: 'Sem dados de vendas na pagina' };
    }

    Logger.log('rows encontrado na posicao ' + startIdx + ' (escaped=' + escaped + ')');

    // Extrair o trecho do array
    let rawChunk = '';
    if (escaped) {
      // Pegar do inicio do array ate o fechamento
      const arrayStart = startIdx + startMarker.length - 2; // volta pro [{
      let depth = 0;
      let endPos = arrayStart;
      for (let i = arrayStart; i < html.length && i < arrayStart + 200000; i++) {
        const ch = html[i];
        if (ch === '[') depth++;
        if (ch === ']') { depth--; if (depth === 0) { endPos = i + 1; break; } }
      }
      rawChunk = html.substring(arrayStart, endPos);
      // Desescapar: \" -> " e \\ -> \
      rawChunk = rawChunk.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else {
      const arrayStart = startIdx + '"rows":'.length;
      let depth = 0;
      let endPos = arrayStart;
      for (let i = arrayStart; i < html.length && i < arrayStart + 200000; i++) {
        if (html[i] === '[') depth++;
        if (html[i] === ']') { depth--; if (depth === 0) { endPos = i + 1; break; } }
      }
      rawChunk = html.substring(arrayStart, endPos);
    }

    let vendas;
    try {
      vendas = JSON.parse(rawChunk);
    } catch(pe) {
      Logger.log('ERRO parse JSON: ' + pe.message + ' | Trecho: ' + rawChunk.substring(0, 300));
      return { erro: 'Erro ao parsear vendas: ' + pe.message };
    }
    Logger.log('Vendas encontradas: ' + vendas.length);

    // Passo 4: Gravar na aba SwellVendas
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    let aba = ss.getSheetByName('SwellVendas');
    if (!aba) {
      aba = ss.insertSheet('SwellVendas');
    }

    // Cabecalho
    const headers = ['ID', 'MES_REF', 'DATA_VENDA', 'CLIENTE', 'CPF', 'EMPREENDIMENTO', 'CONSTRUTORA', 'TIPO', 'VGV', 'UNIDADE', 'CORRETOR', 'COORDENADOR', 'GERENTE', 'VALIDACAO', 'STATUS', 'ARQUIVADA', 'ATUALIZADO_EM'];

    // Limpar e reescrever
    aba.clear();
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);

    if (vendas.length > 0) {
      const rows = vendas.map(v => [
        v.id || '',
        v.mes_ref || '',
        v.data_venda || '',
        v.cliente_nome || '',
        v.cliente_cpf || '',
        v.empreendimento || '',
        v.construtora || '',
        v.tipo || '',
        v.vgv || 0,
        v.unidade || '',
        v.corretor || '',
        v.coordenador || '',
        v.gerente || '',
        v.validacao || '',
        v.status || '',
        v.arquivada ? 'SIM' : 'NAO',
        new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})
      ]);

      aba.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    Logger.log('SwellVendas atualizada: ' + vendas.length + ' vendas');
    return { ok: true, vendas: vendas.length, atualizado: new Date().toISOString() };

  } catch(e) {
    Logger.log('ERRO sincronizarVendasSwell: ' + e.message);
    return { erro: e.message };
  }
}

// Configurar trigger diario para sync Swell
function configurarTriggerSwell() {
  // Remover triggers antigos
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sincronizarVendasSwell') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Rodar todo dia as 8:30
  ScriptApp.newTrigger('sincronizarVendasSwell')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(30)
    .create();
  Logger.log('Trigger Swell configurado: diario as 8:30');
}

// ============================================
// SEPARAR CLIENTES — Mover sem CPF pra aba Agendamentos
// Rodar UMA VEZ no editor (Play)
// ============================================
function separarClientesAgendamentos() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const abaClientes = ss.getSheetByName('Clientes');
  if (!abaClientes) { Logger.log('ERRO: Aba Clientes nao encontrada'); return; }

  const dados = abaClientes.getDataRange().getValues();
  const headers = dados[0];
  const cpfCol = headers.indexOf('CPF');
  if (cpfCol === -1) { Logger.log('ERRO: Coluna CPF nao encontrada'); return; }

  Logger.log('Total de linhas (sem header): ' + (dados.length - 1));
  Logger.log('Coluna CPF: indice ' + cpfCol);

  // Separar: com CPF = pasta, sem CPF = agendamento
  const pastas = [];
  const agendamentos = [];

  for (let i = 1; i < dados.length; i++) {
    const cpf = String(dados[i][cpfCol] || '').trim();
    // CPF valido: tem pelo menos 11 digitos numericos
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length >= 11) {
      pastas.push(dados[i]);
    } else {
      agendamentos.push(dados[i]);
    }
  }

  Logger.log('Pastas (com CPF): ' + pastas.length);
  Logger.log('Agendamentos (sem CPF): ' + agendamentos.length);

  if (agendamentos.length === 0) {
    Logger.log('Nenhum agendamento pra mover. Tudo ja tem CPF.');
    return;
  }

  // Criar ou limpar aba Agendamentos
  let abaAg = ss.getSheetByName('Agendamentos');
  if (!abaAg) {
    abaAg = ss.insertSheet('Agendamentos');
    Logger.log('Aba Agendamentos criada');
  } else {
    abaAg.clear();
    Logger.log('Aba Agendamentos limpa');
  }

  // Gravar headers + agendamentos
  abaAg.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (agendamentos.length > 0) {
    abaAg.getRange(2, 1, agendamentos.length, headers.length).setValues(agendamentos);
  }
  Logger.log('Agendamentos gravados: ' + agendamentos.length);

  // Reescrever aba Clientes so com pastas
  abaClientes.clear();
  abaClientes.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (pastas.length > 0) {
    abaClientes.getRange(2, 1, pastas.length, headers.length).setValues(pastas);
  }
  Logger.log('Clientes (pastas) restantes: ' + pastas.length);
  Logger.log('SEPARACAO CONCLUIDA! Clientes=' + pastas.length + ' | Agendamentos=' + agendamentos.length);
}

// ============================================
// LIMPAR REAL — apaga todos os dados da aba Real (mantém cabeçalho)
// ============================================
function limparReal() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = ss.getSheetByName('Real');
  if (!aba) return { erro: 'Aba Real não encontrada' };

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha <= 1) {
    Logger.log('Aba Real já está vazia (só cabeçalho).');
    return { sucesso: true, removidos: 0, msg: 'Aba Real já estava vazia' };
  }

  const linhasRemover = ultimaLinha - 1;
  aba.deleteRows(2, linhasRemover);
  Logger.log('limparReal: removidas ' + linhasRemover + ' linhas da aba Real.');
  return { sucesso: true, removidos: linhasRemover, msg: linhasRemover + ' linhas removidas da aba Real' };
}

// ============================================
// OBTER APROVADOS PENDENTES — clientes APROVADO/APROVADO-CONDICIONADO que ainda não estão no Real
// ============================================
function obterAprovadosPendentes() {
  const clientes = lerAba('Clientes');
  const real = lerAba('Real');

  // Montar conjunto de identificadores já no Real (CPF e nome)
  const cpfsNoReal = new Set();
  const nomesNoReal = new Set();
  real.forEach(function(r) {
    if (r.CLIENTE) nomesNoReal.add(String(r.CLIENTE).trim().toUpperCase());
  });

  // Buscar CPF na aba Clientes para cruzar com Real
  // A aba Real não tem CPF diretamente — cruzamos por nome do cliente
  const aprovados = clientes.filter(function(c) {
    const status = String(c.STATUS || '').trim().toUpperCase();
    const isAprovado = status === 'APROVADO' || status === 'APROVADO - CONDICIONADO';
    if (!isAprovado) return false;
    const nomeCliente = String(c.CLIENTE || '').trim().toUpperCase();
    return !nomesNoReal.has(nomeCliente);
  });

  return aprovados.map(function(c) {
    return {
      CORRETOR: c.CORRETOR || '',
      CLIENTE: c.CLIENTE || '',
      CPF: c.CPF || '',
      TELEFONE: c.TELEFONE || '',
      EMAIL: c.EMAIL || '',
      RENDA: c.RENDA || '',
      VALOR_APROVADO: c['VALOR APROVADO'] || '',
      STATUS: c.STATUS || '',
      REGIAO: c['REGIÃO'] || c.REGIAO || '',
      DATA_CRIACAO: c['DATA CRIAÇÃO'] || c['DATA CRIACAO'] || ''
    };
  });
}

// ============================================
// ATIVAR CLIENTE REAL — cria entrada no pipeline Real a partir de cliente aprovado
// ============================================
function ativarClienteReal(dados) {
  if (!dados.cliente) return { erro: 'Campo "cliente" obrigatório' };

  const hoje = new Date();
  hoje.setHours(hoje.getHours() - 3); // UTC-3 Brasília
  const hojeStr = hoje.toISOString().split('T')[0];

  const novaLinha = {
    'DATA': hojeStr,
    'CORRETOR': dados.corretor || '',
    'CLIENTE': dados.cliente || '',
    'TELEFONE': dados.telefone || '',
    'VGV_ESTIMADO': dados.vgv || 200000,
    'EMPREENDIMENTO': '',
    'CONSTRUTORA': '',
    'STATUS': 'GERANDO',
    'PENDENCIA': '',
    'DATA_ENTRADA': hojeStr,
    'COMISSAO_STATUS': 'NÃO PAGO',
    'ACIONADO': 'S'
  };

  const resultado = adicionarLinhas('Real', [novaLinha]);
  if (resultado.sucesso) {
    Logger.log('ativarClienteReal: ' + dados.cliente + ' adicionado ao Real por ' + dados.corretor);
  }
  return resultado;
}
