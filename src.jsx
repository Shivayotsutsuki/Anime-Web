import { useState } from "react";
import Auth from "./Auth";

function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("animeUser"))
  );
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div>
      <header>
        <button onClick={() => setShowAuth(!showAuth)}>
          {user ? "Account" : "Sign In / Sign Up"}
        </button>
      </header>

      {showAuth && !user && <Auth onLogin={setUser} />}

      {/* Anime Watching Section */}
      <div>
        <h1>Watch Anime</h1>
        {/* your existing anime player */}
      </div>
    </div>
  );
}

export default App;
