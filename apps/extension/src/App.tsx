import { useEffect, useState } from 'react';
import { z } from 'zod';
import { userObj } from './types/zods';

function App() {
  const [count] = useState(0);
  const [userData, setUserData] = useState<z.infer<typeof userObj> | null>(
    null,
  );

  useEffect(() => {
    const doStuff = () => {
      chrome.runtime.sendMessage({ type: 'getJwt' }, (response) => {
        const jwt = response.jwt;
        const loginButton = document.getElementById('login');

        if (loginButton)
          if (jwt) {
            fetch('http://localhost:3000/api/store', {
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
            })
              .then((res) => res.json())
              .then((data) => {
                const user = userObj.safeParse(data);
                if (user.success) {
                  setUserData(user.data);
                } else {
                  console.error(user.error);
                }
              });
            loginButton.style.display = 'none';
          } else {
            loginButton.style.display = 'block';
            loginButton.addEventListener('click', () => {
              chrome.tabs.create({
                url: 'http://localhost:3000/api/auth/signin',
              });
            });
          }
      });
    };

    doStuff();
    // Set event listerner for storage change
    chrome.storage.onChanged.addListener(() => {
      doStuff();
    });
  }, [count]);

  return (
    <div className="p-8">
      <button id="login">Log in</button>
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
