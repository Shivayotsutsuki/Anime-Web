import { useState } from "react";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!email || !password) return alert("Fill all fields");

    const user = { email, password };
    localStorage.setItem("animeUser", JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>{isLogin ? "Sign In" : "Sign Up"}</h2>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      /><br /><br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />

      <button onClick={handleSubmit}>
        {isLogin ? "Sign In" : "Sign Up"}
      </button>

      <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: "pointer" }}>
        {isLogin ? "Create account" : "Already have an account?"}
      </p>
    </div>
  );
}
