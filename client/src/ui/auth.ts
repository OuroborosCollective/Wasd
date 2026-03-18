export function renderAuthUI(onLogin: (displayName: string, uid?: string) => void) {
  const container = document.createElement("div");
  container.id = "auth-container";
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "center";
  container.style.alignItems = "center";
  container.style.color = "white";
  container.style.fontFamily = "sans-serif";
  container.style.zIndex = "1000";

  const formBox = document.createElement("div");
  formBox.style.backgroundColor = "#222";
  formBox.style.padding = "2rem";
  formBox.style.borderRadius = "8px";
  formBox.style.display = "flex";
  formBox.style.flexDirection = "column";
  formBox.style.gap = "1rem";
  formBox.style.width = "300px";

  const title = document.createElement("h2");
  title.innerText = "Guest Login";
  title.style.margin = "0 0 1rem 0";
  title.style.textAlign = "center";
  formBox.appendChild(title);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Display Name";
  nameInput.style.padding = "0.5rem";
  nameInput.style.borderRadius = "4px";
  nameInput.style.border = "1px solid #444";
  nameInput.style.backgroundColor = "#333";
  nameInput.style.color = "white";
  formBox.appendChild(nameInput);

  const errorMsg = document.createElement("div");
  errorMsg.style.color = "#ff4444";
  errorMsg.style.fontSize = "0.875rem";
  errorMsg.style.minHeight = "1.2rem";
  formBox.appendChild(errorMsg);

  const loginBtn = document.createElement("button");
  loginBtn.innerText = "Play";
  loginBtn.style.padding = "0.5rem";
  loginBtn.style.backgroundColor = "#4CAF50";
  loginBtn.style.color = "white";
  loginBtn.style.border = "none";
  loginBtn.style.borderRadius = "4px";
  loginBtn.style.cursor = "pointer";
  loginBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      errorMsg.innerText = "Please enter a display name.";
      return;
    }

    // Bypass authentication and login directly as guest
    container.style.display = "none";
    onLogin(name, name);
  };
  formBox.appendChild(loginBtn);

  container.appendChild(formBox);
  document.body.appendChild(container);

  return () => {
    container.remove();
  };
}

export function renderLogoutBtn() {
  const btn = document.createElement("button");
  btn.innerText = "Logout";
  btn.style.position = "absolute";
  btn.style.top = "10px";
  btn.style.right = "10px";
  btn.style.padding = "0.5rem 1rem";
  btn.style.backgroundColor = "#f44336";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "900";
  btn.onclick = () => {
    window.location.reload();
  };
  document.body.appendChild(btn);
}
