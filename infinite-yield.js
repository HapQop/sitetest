document.addEventListener("DOMContentLoaded", () => {
  const codeElement = document.querySelector("[data-script-code]");
  const copyButton = document.querySelector("[data-copy-script]");
  const downloadButton = document.querySelector("[data-download-script]");
  const status = document.querySelector("[data-raw-status]");
  const favoriteButton = document.querySelector("[data-script-favorite]");
  const reactionButtons = [...document.querySelectorAll("[data-reaction]")];
  const commentForm = document.querySelector("[data-comment-form]");
  const commentInput = document.querySelector("[data-comment-input]");
  const commentsList = document.querySelector("[data-comments-list]");
  const commentsEmpty = document.querySelector("[data-comments-empty]");
  const commentsCount = document.querySelector("[data-comments-count]");
  const favoriteKey = "cheatblox-script-infinite-yield-favorite";
  const reactionKeys = {
    like: "cheatblox-script-infinite-yield-like",
    dislike: "cheatblox-script-infinite-yield-dislike",
  };
  const commentsKey = "cheatblox-script-infinite-yield-comments";

  if (!codeElement) return;

  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  function syncFavorite() {
    const selected = localStorage.getItem(favoriteKey) === "true";
    favoriteButton?.classList.toggle("is-favorite", selected);
    favoriteButton?.setAttribute("aria-pressed", String(selected));
  }

  function syncReactions() {
    reactionButtons.forEach((button) => {
      const type = button.dataset.reaction;
      const selected = localStorage.getItem(reactionKeys[type]) === "true";
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      const countElement = button.querySelector("[data-reaction-count]");
      if (countElement) countElement.textContent = selected ? "1" : "0";
    });
  }

  function renderComments() {
    if (!commentsList || !commentsEmpty) return;
    const comments = readJson(commentsKey, []);
    commentsList.replaceChildren();
    commentsEmpty.hidden = comments.length > 0;
    if (commentsCount) commentsCount.textContent = String(comments.length);
    comments.forEach((comment) => {
      const item = document.createElement("p");
      item.className = "comment-item";
      item.textContent = comment.text;
      commentsList.append(item);
    });
  }

  favoriteButton?.addEventListener("click", () => {
    const selected = localStorage.getItem(favoriteKey) === "true";
    localStorage.setItem(favoriteKey, String(!selected));
    syncFavorite();
  });

  reactionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.reaction;
      const selected = localStorage.getItem(reactionKeys[type]) === "true";
      Object.values(reactionKeys).forEach((key) => localStorage.setItem(key, "false"));
      localStorage.setItem(reactionKeys[type], String(!selected));
      syncReactions();
    });
  });

  commentForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = commentInput?.value.trim();
    if (!text) return;
    const comments = readJson(commentsKey, []);
    comments.push({ text, createdAt: Date.now() });
    localStorage.setItem(commentsKey, JSON.stringify(comments.slice(-50)));
    commentForm.reset();
    renderComments();
  });

  const code = codeElement.textContent;
  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      if (status) status.textContent = "Copied to clipboard";
    } catch {
      if (status) status.textContent = "Copy is unavailable in this browser";
    }
  });

  downloadButton?.addEventListener("click", () => {
    const blob = new Blob([code + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "infinite-yield.lua";
    link.click();
    URL.revokeObjectURL(url);
  });

  syncFavorite();
  syncReactions();
  renderComments();
});
