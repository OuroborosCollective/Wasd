import { auth } from "../auth/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

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
  title.innerText = "Login / Sign Up";
  title.style.margin = "0 0 1rem 0";
  title.style.textAlign = "center";
  formBox.appendChild(title);

  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "Email";
  emailInput.style.padding = "0.5rem";
  emailInput.style.borderRadius = "4px";
  emailInput.style.border = "1px solid #444";
  emailInput.style.backgroundColor = "#333";
  emailInput.style.color = "white";
  formBox.appendChild(emailInput);

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.placeholder = "Password";
  passwordInput.style.padding = "0.5rem";
  passwordInput.style.borderRadius = "4px";
  passwordInput.style.border = "1px solid #444";
  passwordInput.style.backgroundColor = "#333";
  passwordInput.style.color = "white";
  formBox.appendChild(passwordInput);

  const errorMsg = document.createElement("div");
  errorMsg.style.color = "#ff4444";
  errorMsg.style.fontSize = "0.875rem";
  errorMsg.style.minHeight = "1.2rem";
  formBox.appendChild(errorMsg);

  const loginBtn = document.createElement("button");
  loginBtn.innerText = "Login";
  loginBtn.style.padding = "0.5rem";
  loginBtn.style.backgroundColor = "#4CAF50";
  loginBtn.style.color = "white";
  loginBtn.style.border = "none";
  loginBtn.style.borderRadius = "4px";
  loginBtn.style.cursor = "pointer";
  loginBtn.onclick = async () => {
    try {
      errorMsg.innerText = "";
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (e: any) {
      errorMsg.innerText = e.message;
    }
  };
  formBox.appendChild(loginBtn);

  const signupBtn = document.createElement("button");
  signupBtn.innerText = "Sign Up";
  signupBtn.style.padding = "0.5rem";
  signupBtn.style.backgroundColor = "#2196F3";
  signupBtn.style.color = "white";
  signupBtn.style.border = "none";
  signupBtn.style.borderRadius = "4px";
  signupBtn.style.cursor = "pointer";
  signupBtn.onclick = async () => {
    try {
      errorMsg.innerText = "";
      await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (e: any) {
      errorMsg.innerText = e.message;
    }
  };
  formBox.appendChild(signupBtn);

  container.appendChild(formBox);
  document.body.appendChild(container);

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      container.style.display = "none";
      const displayName = user.displayName || user.email?.split("@")[0] || "Adventurer";
      onLogin(displayName, user.uid);
    } else {
      container.style.display = "flex";
    }
  });

  return () => {
    unsubscribe();
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
    signOut(auth);
    window.location.reload();
  };
  document.body.appendChild(btn);
}

export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}
