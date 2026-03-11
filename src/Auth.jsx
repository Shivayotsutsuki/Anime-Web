import { useState } from "react";

export default function Auth({ onLogin, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }

    const userData = { email };
    localStorage.setItem("animeUser", JSON.stringify(userData));
    onLogin(userData);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        background: "#fff",
        padding: "30px",
        borderRadius: "10px",
        width: "300px"
      }}>
        <h2>{isLogin ? "Sign In" : "Sign Up"}</h2>

        <input
          type="email"
          placeholder="Email"
          style={{ width: "100%", marginBottom: "10px" }}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={{ width: "100%", marginBottom: "10px" }}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={{ width: "100%", marginBottom: "10px" }}
          onClick={handleSubmit}
        >
          {isLogin ? "Sign In" : "Sign Up"}
        </button>

        <p
          style={{ cursor: "pointer", color: "blue" }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </p>

        <button onClick={onClose} style={{ width: "100%" }}>
          Continue Without Login
        </button>
      </div>
    </div>
  );
}
