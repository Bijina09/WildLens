/* toast.js */
(function () {
  const css = `
  #toastBox{position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px}
  .wl-toast{min-width:260px;max-width:340px;padding:14px 18px;border-radius:12px;color:#fff;
    background:rgba(10,30,20,.92);border-left:5px solid #37ff8b;
    box-shadow:0 8px 25px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;
    font-size:15px;animation:toastIn .3s ease}
  .wl-toast.error{border-left-color:#ff5c5c}
  .wl-toast.out{opacity:0;transform:translateX(30px);transition:.3s}
  @keyframes toastIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}

  .wl-modal-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);
    display:flex;align-items:center;justify-content:center;animation:toastIn .2s ease}
  .wl-modal{width:min(380px,90vw);padding:26px;border-radius:18px;color:#fff;
    background:rgba(10,30,20,.97);border:1px solid rgba(55,255,139,.3);
    box-shadow:0 20px 50px rgba(0,0,0,.5)}
  .wl-modal p{font-size:16px;line-height:1.5;margin-bottom:22px}
  .wl-modal-actions{display:flex;justify-content:flex-end;gap:10px}
  .wl-modal-actions button{border:none;padding:10px 20px;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px}
  .wl-btn-cancel{background:rgba(255,255,255,.12);color:#fff}
  .wl-btn-ok{background:#37ff8b;color:#05140c}
  .wl-btn-ok.danger{background:#ff5a5a;color:#fff}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  window.showToast = function (msg, type = "success", ms = 2500) {
    let box = document.getElementById("toastBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "toastBox";
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "wl-toast " + type;
    t.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-circle-xmark" : "fa-circle-check"}"></i><span></span>`;
    t.querySelector("span").textContent = msg;
    box.appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 300);
    }, ms);
  };

  // Usage: if (!(await showConfirm("Sure?", "Delete", true))) return;
  window.showConfirm = function (message, okText = "Confirm", danger = false) {
    return new Promise((resolve) => {
      const ov = document.createElement("div");
      ov.className = "wl-modal-overlay";
      ov.innerHTML = `<div class="wl-modal"><p></p>
        <div class="wl-modal-actions">
          <button class="wl-btn-cancel">Cancel</button>
          <button class="wl-btn-ok ${danger ? "danger" : ""}"></button>
        </div></div>`;
      ov.querySelector("p").textContent = message;
      ov.querySelector(".wl-btn-ok").textContent = okText;
      const onKey = (e) => {
        if (e.key === "Escape") close(false);
      };
      const close = (v) => {
        document.removeEventListener("keydown", onKey);
        ov.remove();
        resolve(v);
      };
      ov.querySelector(".wl-btn-cancel").onclick = () => close(false);
      ov.querySelector(".wl-btn-ok").onclick = () => close(true);
      ov.addEventListener("click", (e) => {
        if (e.target === ov) close(false);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(ov);
      ov.querySelector(".wl-btn-ok").focus();
    });
  };

  // Toast queued before a redirect (used for "Logged out")
  window.flashToast = function (msg, type = "success") {
    sessionStorage.setItem("flash", JSON.stringify({ msg, type }));
  };
  document.addEventListener("DOMContentLoaded", () => {
    const raw = sessionStorage.getItem("flash");
    if (!raw) return;
    sessionStorage.removeItem("flash");
    try {
      const f = JSON.parse(raw);
      showToast(f.msg, f.type);
    } catch (e) {}
  });
})();
