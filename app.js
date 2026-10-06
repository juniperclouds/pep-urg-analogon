const state = {
  role: "medico",
  mode: "legacy",
  step: 1,
  draft: null,
  interrupted: false,
  lastSave: null,
  rx: [],
  vitals: { pa: "148x92", fc: "104", sat: "93%", temp: "38.1" },
  notes: "",
  given: [],
};

const patient = {
  name: "Maria Helena Costa",
  age: 67,
  room: "Sala 3",
  allergy: "DIPIRONA",
  lookalikes: ["hidralazina", "hidroxizina"],
};

const $ = (id) => document.getElementById(id);

function setClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function render() {
  const legacy = state.mode === "legacy";
  $("systemName").textContent = legacy ? "PEP-URG Legado v3.2" : "PEP-URG Resiliente";
  $("roleBadge").textContent = state.role === "medico" ? "Médico plantonista" : "Enfermeiro";
  $("roleBadge").classList.toggle("nurse", state.role === "enfermeiro");
  $("patientBanner").hidden = legacy;
  $("btnVoice").hidden = legacy;
  $("draftChip").hidden = !state.draft;
  $("inspectNote").textContent = legacy
    ? "Tema 3 e 5 · fluxo linear, carga visual alta e botões destrutivos com a mesma affordance."
    : "Tema 3, 5 e 10 · rascunho resiliente, agrupamento Gestalt e adaptação por papel + voz.";
  $("btnLegacy").classList.toggle("active", legacy);
  $("btnProposal").classList.toggle("active", !legacy);
  $("workspace").innerHTML = legacy ? legacyView() : proposalView();
  bindWorkspace();
}

function legacyView() {
  const isMed = state.role === "medico";
  return `
    <div class="legacy-wrap">
      <h2>Prontuário / Atendimento / Prescrição / Enfermagem / Faturamento / Relatórios / Config</h2>
      <p class="dense">Pac: Costa, M. H. | 67a | F | Atend 88421 | Convênio SUS | Leito 3 | CID R50 R06 I10 | Alergias ver aba 7 | Último save: — | Usuário: ${isMed ? "MED_PLANT" : "ENF_PLANT"} | Mesma tela para todos os papéis</p>
      <div class="wizard">
        <span class="${state.step === 1 ? "on" : ""}">1 Identificação</span>
        <span class="${state.step === 2 ? "on" : ""}">2 Anamnese</span>
        <span class="${state.step === 3 ? "on" : ""}">3 Prescrição</span>
        <span class="${state.step === 4 ? "on" : ""}">4 Encerrar</span>
      </div>
      <div class="grid">
        <div class="card">
          <h3>Dados clínicos (não agrupados)</h3>
          <p class="dense">
            PA148x92 FC104 FR24 Sat93 Temp38.1 Glic128 NEWS? HGT ok? Dipirona? Dor 8/10. Qx 2019 colecistectomia.
            Medicações de casa: losartana 50 mg 1-0-1, AAS 100 mg, sinvastatina 40 mg, omeprazol 20 mg.
            Queixa: dispneia + febre 12h. Hipótese: sepse? ICC? TEA? Campo livre único, sem hierarquia visual.
            Observação anterior misturada: “família na sala”, “aguardando raio-x”, “pendente prescrição de KCl”, “NÃO USAR DIPIRONA”.
          </p>
          <table>
            <tr><th>Item</th><th>Valor</th><th>Ação</th></tr>
            <tr><td>hidralazina 25mg</td><td>prescrever</td><td><button class="same" data-act="lookalike">OK</button></td></tr>
            <tr><td>hidroxizina 25mg</td><td>prescrever</td><td><button class="same" data-act="lookalike">OK</button></td></tr>
            <tr><td>dipirona 1g EV</td><td>prescrever</td><td><button class="same" data-act="allergy">OK</button></td></tr>
            <tr><td>KCl 10mEq</td><td>prescrever</td><td><button class="same" data-act="kcl">OK</button></td></tr>
          </table>
          <div class="row-actions">
            <button class="same" data-act="next">Próximo passo</button>
            <button class="same" data-act="save">Salvar</button>
            <button class="same" data-act="delete">Excluir atendimento</button>
            <button class="same" data-act="print">Imprimir</button>
          </div>
          <p class="hidden-eq">Falsa affordance: Salvar, Excluir e Prescrever têm o mesmo peso visual.</p>
        </div>
        <div class="card">
          <h3>Fila / alertas</h3>
          <div class="alert">Alerta: assinar termo</div>
          <div class="alert">Alerta: faturamento AIH</div>
          <div class="alert">Alerta: alergia (detalhe na aba 7)</div>
          <div class="alert">Alerta: estoque de luva</div>
          <label class="field">Notas (perdidas se sair do passo)
            <textarea data-field="notes">${state.notes}</textarea>
          </label>
          ${isMed ? "<p>Prescrição e checagem de enfermagem compartilham os mesmos botões.</p>" : "<p>Enfermagem precisa localizar a prescrição no mesmo emaranhado da tela médica.</p>"}
        </div>
      </div>
    </div>
  `;
}

function proposalView() {
  const isMed = state.role === "medico";
  const rxRows = state.rx.length
    ? state.rx.map((r) => `<tr><td>${r}</td><td>${isMed ? "pendente checagem" : "a administrar"}</td></tr>`).join("")
    : `<tr><td colspan="2">Nenhuma prescrição ativa neste rascunho.</td></tr>`;
  return `
    <div class="grid">
      <div class="card">
        <h3>${isMed ? "Prescrição segura" : "Administração e sinais"}</h3>
        ${state.draft ? `<p class="okbox">Rascunho retomado após interrupção. Último save: ${state.lastSave || "agora"}.</p>` : ""}
        ${isMed ? `
          <p>Objetivo: prescrever com reconhecimento, não memorização. Alergia e look-alikes ficam visíveis.</p>
          <div class="warnbox">Alergia ativa: não prescrever DIPIRONA. Campo de busca não sugere o item bloqueado.</div>
          <label class="field">Medicamento
            <select id="drug">
              <option value="ondansetrona">ondansetrona 8 mg EV</option>
              <option value="kcl">cloreto de potássio 10 mEq EV (alto risco)</option>
              <option value="hidralazina">HIDRALazina 25 mg (≠ hidroxizina)</option>
              <option value="dipirona" disabled>dipirona — bloqueada por alergia</option>
            </select>
          </label>
          <div class="row-actions">
            <button type="button" data-act="addRx">Adicionar à prescrição</button>
            <button type="button" class="ghost" data-act="saveDraft">Salvar rascunho</button>
            <button type="button" class="danger" data-act="sign">Assinar e enviar</button>
          </div>
        ` : `
          <p>Interface adaptada ao papel: checagem e sinais, sem CPOE completo.</p>
          <p>PA ${state.vitals.pa} · FC ${state.vitals.fc} · Sat ${state.vitals.sat} · Temp ${state.vitals.temp}</p>
          <label class="field">Novo registro de PA
            <input id="paInput" placeholder="ex.: 80 x 50" />
          </label>
          <div class="row-actions">
            <button type="button" data-act="saveVitals">Registrar sinais</button>
            <button type="button" data-act="give">Administrar ondansetrona 8 mg EV</button>
          </div>
          ${state.given.length ? `<p class="okbox">Administrado: ${state.given.join(", ")}</p>` : ""}
        `}
        <h3>Itens clínicos</h3>
        <table>
          <tr><th>Item</th><th>Estado</th></tr>
          ${rxRows}
        </table>
      </div>
      <div class="card">
        <h3>Contexto persistente</h3>
        <p>Proximidade e região comum (Gestalt): alergia, gravidade e rascunho permanecem no banner, não na memória de trabalho.</p>
        <ul>
          <li>Autosave a cada alteração relevante.</li>
          <li>Ação destrutiva exige confirmação explícita.</li>
          <li>Voz entra como canal complementar, com confirmação de dose.</li>
          <li>Alvos grandes para uso com luva.</li>
        </ul>
        <label class="field">Evolução (não se perde ao sair)
          <textarea data-field="notes">${state.notes}</textarea>
        </label>
      </div>
    </div>
  `;
}

function bindWorkspace() {
  $("workspace").querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.act));
  });
  const notes = $("workspace").querySelector("[data-field='notes']");
  if (notes) notes.addEventListener("input", (e) => {
    state.notes = e.target.value;
    if (state.mode === "proposal") saveDraft(false);
  });
}

function handleAction(act) {
  if (act === "next") {
    state.step = Math.min(4, state.step + 1);
    render();
    return;
  }
  if (act === "delete") {
    alert("No legado, Excluir atendimento executa imediatamente — mesma aparência de Salvar. Atendimento simulado removido.");
    state.notes = "";
    state.step = 1;
    render();
    return;
  }
  if (act === "allergy") {
    alert("Dipirona prescrita. A alergia estava na aba 7. Achado de inspeção heurística: severidade catastrófica.");
    return;
  }
  if (act === "lookalike") {
    alert("Look-alike: hidralazina e hidroxizina aparecem iguais. Sem Tall Man lettering nem confirmação.");
    return;
  }
  if (act === "kcl" || act === "save" || act === "print") {
    alert("Ação executada sem confirmação de alto risco. O fluxo legado privilegia velocidade aparente, não prevenção de erro.");
    return;
  }
  if (act === "addRx") {
    const drug = document.getElementById("drug").selectedOptions[0].textContent;
    if (drug.toLowerCase().includes("potássio")) {
      confirmModal("Medicamento de alto risco", "Confirme cloreto de potássio 10 mEq EV. Diluição e bomba devem ser checadas.", () => {
        state.rx.push(drug);
        saveDraft(true);
      });
    } else {
      state.rx.push(drug);
      saveDraft(true);
    }
    return;
  }
  if (act === "saveDraft") { saveDraft(true); return; }
  if (act === "sign") {
    confirmModal("Assinar prescrição", "A assinatura torna o item visível para enfermagem. Revise alergia e doses.", () => {
      saveDraft(true);
      alert("Prescrição assinada. Enfermagem passa a ver os itens no papel adaptado.");
    });
    return;
  }
  if (act === "saveVitals") {
    const value = document.getElementById("paInput").value || "80x50";
    state.vitals.pa = value;
    saveDraft(true);
    return;
  }
  if (act === "give") {
    confirmModal("Administrar medicamento", "Confirma ondansetrona 8 mg EV em Maria Helena Costa, sala 3, sem alergia cruzada conhecida?", () => {
      state.given.push("ondansetrona 8 mg EV " + new Date().toLocaleTimeString("pt-BR"));
      render();
    });
  }
}

function saveDraft(redraw) {
  state.draft = { rx: [...state.rx], notes: state.notes, vitals: { ...state.vitals } };
  state.lastSave = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (redraw) render();
}

function confirmModal(title, body, onOk) {
  $("modalTitle").textContent = title;
  $("modalBody").textContent = body;
  $("modal").hidden = false;
  $("modalOk").onclick = () => { $("modal").hidden = true; onOk(); };
  $("modalCancel").onclick = () => { $("modal").hidden = true; };
}

function simulateInterrupt() {
  if (state.mode === "legacy") {
    state.interrupted = true;
    state.notes = "";
    state.step = 1;
    $("interruptOverlay").hidden = false;
  } else {
    saveDraft(false);
    $("interruptOverlay").hidden = false;
  }
}

function applyVoice(cmd) {
  if (cmd === "pa") {
    state.vitals.pa = "80x50";
    $("voiceStatus").textContent = "Reconhecido: PA 80x50. Registrado no papel de enfermagem. Confirme se o valor é hipotensão nova.";
    saveDraft(true);
  } else if (cmd === "rx") {
    $("voiceStatus").textContent = "Reconhecido: KCl 10 mEq. Não assinado. Exige confirmação por risco e por ruído do PS.";
    confirmModal("Confirmar comando de voz", "Prescrever cloreto de potássio 10 mEq EV para Maria Helena Costa?", () => {
      state.rx.push("cloreto de potássio 10 mEq EV (via voz, confirmado)");
      saveDraft(true);
    });
  } else if (cmd === "med") {
    $("voiceStatus").textContent = "Reconhecido: administrar ondansetrona. Papel enfermeiro; médico só prescreve.";
    if (state.role === "enfermeiro") {
      state.given.push("ondansetrona 8 mg EV (voz)");
      saveDraft(true);
    } else {
      alert("Personalização adaptativa: o papel médico não administra. O comando foi recusado e sugerido como prescrição.");
    }
  }
}

function enterRole(role) {
  state.role = role;
  $("gate").hidden = true;
  document.querySelector(".topbar").hidden = false;
  $("main").hidden = false;
  render();
}

document.querySelectorAll("[data-role]").forEach((btn) => {
  btn.addEventListener("click", () => enterRole(btn.dataset.role));
});

const params = new URLSearchParams(location.search);
if (params.get("role") === "medico" || params.get("role") === "enfermeiro") {
  if (params.get("mode") === "proposal") state.mode = "proposal";
  enterRole(params.get("role"));
  if (params.get("interrupt") === "1") simulateInterrupt();
  if (params.get("voice") === "1" && state.mode === "proposal") $("voicePanel").hidden = false;
}

$("btnLegacy").addEventListener("click", () => { state.mode = "legacy"; render(); });
$("btnProposal").addEventListener("click", () => { state.mode = "proposal"; render(); });
$("btnLogout").addEventListener("click", () => location.reload());
$("btnInterrupt").addEventListener("click", simulateInterrupt);
$("btnReturn").addEventListener("click", () => {
  $("interruptOverlay").hidden = true;
  render();
  if (state.mode === "legacy") alert("Você voltou ao passo 1. Anotações e prescrição não assinada foram perdidas.");
});
$("btnVoice").addEventListener("click", () => { $("voicePanel").hidden = false; });
$("btnCloseVoice").addEventListener("click", () => { $("voicePanel").hidden = true; });
document.querySelectorAll("[data-cmd]").forEach((btn) => btn.addEventListener("click", () => applyVoice(btn.dataset.cmd)));
setInterval(setClock, 1000);
setClock();
