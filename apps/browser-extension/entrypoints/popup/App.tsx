import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [userSignedIn, setUserSignedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const result = await chrome.storage.local.get(['bearerToken']);
        setUserSignedIn(!!result.bearerToken);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUserSignedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleSignOut = async () => {
    try {
      await chrome.storage.local.remove(['bearerToken']);
      setUserSignedIn(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="header">
          <img src="/icon-48.png" alt="Supermemory" className="logo" />
          <h1>Supermemory</h1>
        </div>
        <div className="content">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="header">
        <img src="/icon-48.png" alt="Supermemory" className="logo" />
        <h1>Supermemory</h1>
      </div>
      <div className="content">
        {userSignedIn ? (
          <div className="authenticated">
            <div className="status">
              <span className="status-indicator signed-in"></span>
              <span>Signed in</span>
            </div>
            <div className="actions">
              <button
                onClick={() => {
                  chrome.tabs.create({
                    url: 'https://chatgpt.com/#settings/Personalization',
                  });
                }}
                className="chatgpt-btn"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/1/13/ChatGPT-Logo.png" 
                  alt="ChatGPT" 
                  className="chatgpt-logo"
                />
                Import ChatGPT Memories
              </button>
              <button className="sign-out-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="unauthenticated">
            <div className="status">
              <span className="status-indicator signed-out"></span>
              <span>Not signed in</span>
            </div>
            <p className="instruction">
              <a
                onClick={() => {
                  chrome.tabs.create({
                    url: 'https://app.supermemory.ai/login',
                  });
                }}
              >
                Login to Supermemory
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
