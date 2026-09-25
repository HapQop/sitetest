document.addEventListener("DOMContentLoaded", () => {
  const codeElement = document.querySelector("[data-script-code]");
  const favoriteButton = document.querySelector("[data-script-favorite]");
  const copyButton = document.querySelector("[data-copy-script]");
  const downloadButton = document.querySelector("[data-download-script]");
  const status = document.querySelector("[data-raw-status]");
  const reactions = [...document.querySelectorAll("[data-reaction]")];
  const form = document.querySelector("[data-comment-form]");
  const input = document.querySelector("[data-comment-input]");
  const list = document.querySelector("[data-comments-list]");
  const empty = document.querySelector("[data-comments-empty]");
  const count = document.querySelector("[data-comments-count]");
  const favoriteKey = "cheatblox-script-chilli-hub-favorite";
  const reactionKeys = { like: "cheatblox-script-chilli-hub-like", dislike: "cheatblox-script-chilli-hub-dislike" };
  const commentsKey = "cheatblox-script-chilli-hub-comments";
  if (!codeElement) return;

  const readComments = () => {
    try { return JSON.parse(localStorage.getItem(commentsKey)) || []; } catch { return []; }
  };
  const syncFavorite = () => {
    const selected = localStorage.getItem(favoriteKey) === "true";
    favoriteButton?.classList.toggle("is-favorite", selected);
    favoriteButton?.setAttribute("aria-pressed", String(selected));
  };
  const syncReactions = () => reactions.forEach((button) => {
    const selected = localStorage.getItem(reactionKeys[button.dataset.reaction]) === "true";
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector("[data-reaction-count]")?.replaceChildren(selected ? "1" : "0");
  });
  const renderComments = () => {
    const comments = readComments();
    if (list) list.replaceChildren();
    if (empty) empty.hidden = comments.length > 0;
    if (count) count.textContent = String(comments.length);
    comments.forEach(({ text }) => { const item = document.createElement("p"); item.className = "comment-item"; item.textContent = text; list?.append(item); });
  };

  favoriteButton?.addEventListener("click", () => { localStorage.setItem(favoriteKey, String(localStorage.getItem(favoriteKey) !== "true")); syncFavorite(); });
  reactions.forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.reaction;
    const selected = localStorage.getItem(reactionKeys[type]) === "true";
    Object.values(reactionKeys).forEach((key) => localStorage.setItem(key, "false"));
    localStorage.setItem(reactionKeys[type], String(!selected));
    syncReactions();
  }));
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input?.value.trim();
    if (!text) return;
    localStorage.setItem(commentsKey, JSON.stringify([...readComments(), { text, createdAt: Date.now() }].slice(-50)));
    form.reset();
    renderComments();
  });
  const code = codeElement.textContent;
  copyButton?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(code); if (status) status.textContent = "Copied to clipboard"; } catch { if (status) status.textContent = "Copy is unavailable in this browser"; } });
  downloadButton?.addEventListener("click", () => { const url = URL.createObjectURL(new Blob([`${code}\n`], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "chilli-hub.lua"; link.click(); URL.revokeObjectURL(url); });
  syncFavorite();
  syncReactions();
  renderComments();
});
