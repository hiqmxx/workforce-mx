/* Workforce MX — chatbot widget (v2, más visible: botón grande + chip + pulso + lead capture) */
(function () {
  var API = "/api/chat";
  var ACCENT = "#3b82f6";
  var ACCENT2 = "#06b6d4";
  var BG = "#0a0e17";
  var CARD = "#111827";
  var TEXT = "#e2e8f0";
  var MUTED = "#94a3b8";
  var BORDER = "#1e293b";

  var css = document.createElement("style");
  css.textContent =
    "#wfmx-btn{position:fixed;bottom:24px;right:24px;z-index:9999;width:74px;height:74px;border-radius:50%;" +
    "background:linear-gradient(135deg," + ACCENT + "," + ACCENT2 + ");border:none;cursor:pointer;" +
    "box-shadow:0 10px 28px rgba(59,130,246,.55);color:#fff;font-size:2rem;display:flex;align-items:center;justify-content:center;" +
    "animation:wfmxPulse 2.4s ease-in-out infinite;transition:transform .2s}" +
    "#wfmx-btn:hover{transform:scale(1.15)}" +
    "@keyframes wfmxPulse{0%,100%{box-shadow:0 10px 28px rgba(59,130,246,.55)}50%{box-shadow:0 10px 38px rgba(6,182,212,.75)}}" +
    "#wfmx-hint{position:fixed;bottom:44px;right:112px;z-index:9998;background:#fff;color:#0a0e17;font-size:.85rem;font-weight:700;" +
    "padding:.55rem .8rem;border-radius:14px 14px 14px 4px;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer;" +
    "opacity:0;transform:translateX(12px);transition:opacity .35s,transform .35s;white-space:nowrap;border:2px solid rgba(59,130,246,.35)}" +
    "#wfmx-hint.show{opacity:1;transform:none}" +
    "#wfmx-hint::after{content:'';position:absolute;right:-14px;top:18px;border-width:10px 0 10px 14px;border-style:solid;border-color:transparent transparent transparent #fff}" +
    "#wfmx-panel{position:fixed;bottom:110px;right:24px;z-index:9999;width:min(370px,94vw);height:500px;max-height:72vh;" +
    "background:" + CARD + ";border:1px solid " + BORDER + ";border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif}" +
    "#wfmx-panel.open{display:flex;animation:wfmxIn .25s ease}" +
    "@keyframes wfmxIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}" +
    "#wfmx-head{padding:.95rem 1rem;background:linear-gradient(135deg," + ACCENT + " 0%,#2563eb 100%);color:#fff;display:flex;align-items:center;gap:.6rem}" +
    "#wfmx-head .wfmx-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:800}" +
    "#wfmx-head .wfmx-title{font-weight:800;font-size:.95rem;line-height:1.15}" +
    "#wfmx-head .wfmx-sub{font-size:.72rem;color:rgba(255,255,255,.85)}" +
    "#wfmx-head .wfmx-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#34d399;margin-right:.35rem;vertical-align:0}" +
    "#wfmx-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.9);font-size:1.4rem;cursor:pointer;padding:.2rem .5rem;border-radius:8px}" +
    "#wfmx-close:hover{background:rgba(255,255,255,.15)}" +
    "#wfmx-body{flex:1;overflow-y:auto;padding:.9rem;display:flex;flex-direction:column;gap:.6rem;background:" + BG + "}" +
    ".wfmx-msg{max-width:82%;padding:.6rem .75rem;border-radius:12px;font-size:.9rem;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
    ".wfmx-bot{background:#1e293b;color:" + TEXT + ";border:1px solid " + BORDER + ";border-bottom-left-radius:4px;align-self:flex-start}" +
    ".wfmx-user{background:" + ACCENT + ";color:#fff;border-bottom-right-radius:4px;align-self:flex-end}" +
    ".wfmx-typing{opacity:.75;font-style:italic;color:" + MUTED + "}" +
    "#wfmx-foot{padding:.65rem;border-top:1px solid " + BORDER + ";display:flex;flex-direction:column;gap:.4rem;background:" + CARD + "}" +
    "#wfmx-input-row{display:flex;gap:.5rem}" +
    "#wfmx-input{flex:1;background:" + BG + ";border:1px solid " + BORDER + ";border-radius:10px;padding:.65rem .75rem;color:" + TEXT + ";font-size:.9rem;outline:none}" +
    "#wfmx-input:focus{border-color:" + ACCENT + "}" +
    "#wfmx-send{background:linear-gradient(135deg," + ACCENT + "," + ACCENT2 + ");color:#fff;border:none;border-radius:10px;padding:.65rem .9rem;cursor:pointer;font-weight:700}" +
    "#wfmx-send:disabled{opacity:.5;cursor:default}" +
    "@media (max-width:480px){#wfmx-panel{right:8px;bottom:96px}#wfmx-btn{right:14px;bottom:16px;width:64px;height:64px;font-size:1.7rem}#wfmx-hint{right:92px;bottom:32px;font-size:.75rem}}";
  document.head.appendChild(css);

  var btn = document.createElement("button");
  btn.id = "wfmx-btn";
  btn.setAttribute("aria-label", "Abrir chat de Workforce MX");
  btn.innerHTML = "&#128172;";
  document.body.appendChild(btn);

  var hint = document.createElement("div");
  hint.id = "wfmx-hint";
  hint.innerHTML = "&#128172; &iexcl;Preg&uacute;ntame!";
  document.body.appendChild(hint);

  var panel = document.createElement("div");
  panel.id = "wfmx-panel";
  panel.setAttribute("role", "dialog");
  panel.innerHTML =
    '<div id="wfmx-head"><div class="wfmx-avatar">WF</div>' +
    '<div><div class="wfmx-title">Workforce MX</div><div class="wfmx-sub"><span class="wfmx-dot"></span>En línea &middot; responde al instante</div></div>' +
    '<button id="wfmx-close" aria-label="Cerrar chat">&times;</button></div>' +
    '<div id="wfmx-body"></div>' +
    '<div id="wfmx-foot">' +
    '  <div id="wfmx-input-row"><input id="wfmx-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" maxlength="500" />' +
    '  <button id="wfmx-send">Enviar</button></div>' +
    '</div>';
  document.body.appendChild(panel);

  var bodyEl = panel.querySelector("#wfmx-body");
  var inputEl = panel.querySelector("#wfmx-input");
  var sendBtn = panel.querySelector("#wfmx-send");

  function addMsg(text, who) {
    var d = document.createElement("div");
    d.className = "wfmx-msg wfmx-" + who;
    d.textContent = text;
    bodyEl.appendChild(d);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return d;
  }

  function greet() {
    addMsg("Hola, soy el asistente de Workforce MX. ¿Qué necesitas? Te puedo orientar sobre servicios. Para cotizar, escríbenos directo por WhatsApp al 3329531372 o al correo admin@workforcemx.com.", "bot");
  }

  function openPanel() {
    panel.classList.add("open");
    if (!bodyEl.dataset.greeted) {
      greet();
      bodyEl.dataset.greeted = "1";
    }
    hint.classList.remove("show");
    inputEl.focus();
  }
  function closePanel() {
    panel.classList.remove("open");
  }

  window.wfmxOpenChat = openPanel;

  async function send() {
    var text = inputEl.value.trim();
    if (!text) return;
    addMsg(text, "user");
    inputEl.value = "";
    sendBtn.disabled = true;
    var typing = addMsg("escribiendo...", "bot");
    typing.classList.add("wfmx-typing");

    try {
      var res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      var data = await res.json();
      typing.remove();
      if (res.ok && data.reply) {
        addMsg(data.reply, "bot");
      } else {
        addMsg("No pude procesar tu mensaje. Intenta de nuevo o escribenos por WhatsApp al 3329531372.", "bot");
      }
    } catch (e) {
      typing.remove();
      addMsg("El servicio no esta disponible ahora. Escribenos por WhatsApp al 3329531372.", "bot");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  btn.addEventListener("click", function () {
    panel.classList.contains("open") ? closePanel() : openPanel();
  });
  hint.addEventListener("click", openPanel);
  panel.querySelector("#wfmx-close").addEventListener("click", closePanel);
  sendBtn.addEventListener("click", send);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });

  setTimeout(function () {
    if (!bodyEl.dataset.greeted) hint.classList.add("show");
  }, 1500);
})();
