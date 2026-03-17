const fs = require('fs');
let file = fs.readFileSync('client/src/ui/auth.ts', 'utf8');

file = file.replace(/loginBtn\.onclick = async \(\) => \{\n    try \{\n      errorMsg\.innerText = "";\n      await signInWithEmailAndPassword\(auth, emailInput\.value, passwordInput\.value\);\n    \} catch \(e: any\) \{\n      errorMsg\.innerText = e\.message;\n    \}\n  \};/g, `loginBtn.onclick = async () => {
    try {
      errorMsg.innerText = "";
      loginBtn.disabled = true;
      loginBtn.innerText = "Logging in...";
      loginBtn.setAttribute("aria-busy", "true");
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (e: any) {
      errorMsg.innerText = e.message;
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
      loginBtn.removeAttribute("aria-busy");
    }
  };`);

file = file.replace(/signupBtn\.onclick = async \(\) => \{\n    try \{\n      errorMsg\.innerText = "";\n      await createUserWithEmailAndPassword\(auth, emailInput\.value, passwordInput\.value\);\n    \} catch \(e: any\) \{\n      errorMsg\.innerText = e\.message;\n    \}\n  \};/g, `signupBtn.onclick = async () => {
    try {
      errorMsg.innerText = "";
      signupBtn.disabled = true;
      signupBtn.innerText = "Signing up...";
      signupBtn.setAttribute("aria-busy", "true");
      await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (e: any) {
      errorMsg.innerText = e.message;
      signupBtn.disabled = false;
      signupBtn.innerText = "Sign Up";
      signupBtn.removeAttribute("aria-busy");
    }
  };`);

fs.writeFileSync('client/src/ui/auth.ts', file);
