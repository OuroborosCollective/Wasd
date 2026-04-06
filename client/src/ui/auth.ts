import { auth } from "../auth/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export function renderAuthUI(onLogin: (token?: string) => void) {
  if (!auth) {
    const err = document.createElement("div");
    err.textContent = "Firebase is not configured (missing VITE_FIREBASE_* or config).";
    err.style.cssText = "padding:2rem;color:#f88;";
    document.body.appendChild(err);
    return () => err.remove();
  }
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
  formBox.style.padding = "2.5rem";
  formBox.style.borderRadius = "16px";
  formBox.style.display = "flex";
  formBox.style.flexDirection = "column";
  formBox.style.gap = "1.2rem";
  formBox.style.width = "90vw";
  formBox.style.maxWidth = "400px";
  formBox.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
  formBox.style.border = "2px solid #00ff00";

  const title = document.createElement("h2");
  title.innerText = "Areloria Login";
  title.style.margin = "0 0 1rem 0";
  title.style.textAlign = "center";
  title.style.color = "#00ff00";
  formBox.appendChild(title);

  const googleBtn = document.createElement("button");
  googleBtn.innerText = "Login with Google";
  googleBtn.style.padding = "1rem";
  googleBtn.style.backgroundColor = "#4285F4";
  googleBtn.style.color = "white";
  googleBtn.style.border = "none";
  googleBtn.style.borderRadius = "8px";
  googleBtn.style.cursor = "pointer";
  googleBtn.style.fontWeight = "bold";
  googleBtn.style.fontSize = "1.1rem";
  googleBtn.onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth!, provider);
    } catch (e: any) {
      errorMsg.innerText = e.message;
    }
  };
  formBox.appendChild(googleBtn);

  const divider = document.createElement("div");
  divider.style.display = "flex";
  divider.style.alignItems = "center";
  divider.style.gap = "0.5rem";
  divider.innerHTML = '<div style="flex:1;height:1px;background:#444"></div><span style="font-size:0.9rem;color:#888">OR</span><div style="flex:1;height:1px;background:#444"></div>';
  formBox.appendChild(divider);

  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "Email";
  emailInput.style.padding = "1rem";
  emailInput.style.borderRadius = "8px";
  emailInput.style.border = "1px solid #444";
  emailInput.style.backgroundColor = "#333";
  emailInput.style.color = "white";
  emailInput.style.fontSize = "1rem";
  formBox.appendChild(emailInput);

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.placeholder = "Password";
  passwordInput.style.padding = "1rem";
  passwordInput.style.borderRadius = "8px";
  passwordInput.style.border = "1px solid #444";
  passwordInput.style.backgroundColor = "#333";
  passwordInput.style.color = "white";
  passwordInput.style.fontSize = "1rem";
  formBox.appendChild(passwordInput);

  const errorMsg = document.createElement("div");
  errorMsg.style.color = "#ff4444";
  errorMsg.style.fontSize = "0.9rem";
  errorMsg.style.minHeight = "1.2rem";
  errorMsg.style.textAlign = "center";
  formBox.appendChild(errorMsg);

  const loginBtn = document.createElement("button");
  loginBtn.innerText = "Login";
  loginBtn.style.padding = "1rem";
  loginBtn.style.backgroundColor = "#4CAF50";
  loginBtn.style.color = "white";
  loginBtn.style.border = "none";
  loginBtn.style.borderRadius = "8px";
  loginBtn.style.cursor = "pointer";
  loginBtn.style.fontWeight = "bold";
  loginBtn.style.fontSize = "1.1rem";
  loginBtn.onclick = async () => {
    try {
      errorMsg.innerText = "";
      await signInWithEmailAndPassword(auth!, emailInput.value, passwordInput.value);
    } catch (e: any) {
      errorMsg.innerText = e.message;
    }
  };
  formBox.appendChild(loginBtn);

  const signupBtn = document.createElement("button");
  signupBtn.innerText = "Sign Up";
  signupBtn.style.padding = "1rem";
  signupBtn.style.backgroundColor = "#2196F3";
  signupBtn.style.color = "white";
  signupBtn.style.border = "none";
  signupBtn.style.borderRadius = "8px";
  signupBtn.style.cursor = "pointer";
  signupBtn.style.fontWeight = "bold";
  signupBtn.style.fontSize = "1.1rem";
  signupBtn.onclick = async () => {
    try {
      errorMsg.innerText = "";
      await createUserWithEmailAndPassword(auth!, emailInput.value, passwordInput.value);
    } catch (e: any) {
      errorMsg.innerText = e.message;
    }
  };
  formBox.appendChild(signupBtn);

  container.appendChild(formBox);
  document.body.appendChild(container);

  const unsubscribe = onAuthStateChanged(auth!, async (user) => {
    if (user) {
      container.style.display = "none";
      const token = await user.getIdToken();
      onLogin(token);
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
  if (!auth) return;
  const btn = document.createElement("button");
  btn.innerText = "Logout";
  btn.style.position = "fixed";
  btn.style.top = "10px";
  btn.style.right = "10px";
  btn.style.padding = "12px 20px";
  btn.style.backgroundColor = "#f44336";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "2000";
  btn.style.fontWeight = "bold";
  btn.onclick = () => {
    signOut(auth!);
    window.location.reload();
  };
  document.body.appendChild(btn);
}
