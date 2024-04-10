import { useEffect, useState } from 'react';
import { z } from 'zod';
import { userObj } from './types/zods';
import { getEnv } from './util';

const backendUrl = getEnv() === "development" ? "http://localhost:3000" : "https://supermemory.dhr.wtf";

function App() {
  const [userData, setUserData] = useState<z.infer<typeof userObj> | null>(
    null,
  );

  const doStuff = () => {
    chrome.runtime.sendMessage({ type: 'getJwt' }, (response) => {
      const jwt = response.jwt;
      const loginButton = document.getElementById('login');

      if (loginButton) {
        if (jwt) {
          fetch(`${backendUrl}/api/me`, {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              const d = userObj.safeParse(data);
              if (d.success) {
                setUserData(d.data);
              } else {
                console.error(d.error);
              }
            });
          loginButton.style.display = 'none';
        }
      }
    });
  };

  useEffect(() => {
    doStuff();
  }, []);

  return (
    <div className="p-8">
      <button
        onClick={() =>
          chrome.tabs.create({
            url: `${backendUrl}/api/auth/signin`,
          })
        }
        id="login"
      >
        Log in
      </button>
      <div>
        {userData && (
          <div className="flex items-center">
            <img
              width={40}
              className="rounded-full"
              src={userData.data.user.image!}
              alt=""
            />
            <div>
              <h3>{userData.data.user.name}</h3>
              <p>{userData.data.user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
