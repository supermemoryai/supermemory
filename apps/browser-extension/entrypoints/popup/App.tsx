import React, { useState, useEffect } from 'react';
import './App.css';
import { getProjects, getDefaultProject, setDefaultProject } from '../../utils/api';
import { Project } from '../../utils/types';

function App() {
  const [userSignedIn, setUserSignedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [defaultProject, setDefaultProjectState] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [showProjectSelector, setShowProjectSelector] = useState<boolean>(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const result = await chrome.storage.local.get(['bearerToken']);
        const isSignedIn = !!result.bearerToken;
        setUserSignedIn(isSignedIn);
        
        if (isSignedIn) {
          try {
            const defaultProj = await getDefaultProject();
            setDefaultProjectState(defaultProj);
          } catch (error) {
            console.error('Error loading default project:', error);
          }
        }
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

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const projectsList = await getProjects();
      setProjects(projectsList);
      console.log('Projects:', projectsList);
      console.log('Default project:', defaultProject);
      // If no default project is set and projects are available, set first as default
      if (!defaultProject && projectsList.length > 0) {
        const firstProject = projectsList[0];
        await setDefaultProject(firstProject);
        setDefaultProjectState(firstProject);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    try {
      await setDefaultProject(project);
      setDefaultProjectState(project);
      setShowProjectSelector(false);
    } catch (error) {
      console.error('Error setting default project:', error);
    }
  };

  const handleShowProjectSelector = () => {
    console.log('handleShowProjectSelector, projects.length:', projects.length);
    if (projects.length === 0) {
      loadProjects();
    }
    setShowProjectSelector(true);
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
            
            <div className="project-section">
              <div className="project-header">
                <span className="project-label">Default Project:</span>
                <button 
                  className="project-change-btn" 
                  onClick={handleShowProjectSelector}
                >
                  Change
                </button>
              </div>
              <div className="project-current">
                {defaultProject ? (
                  <div className="project-info">
                    <span className="project-name">{defaultProject.name}</span>
                  </div>
                ) : (
                  <span className="project-none">No project selected</span>
                )}
              </div>
            </div>

            {showProjectSelector && (
              <div className="project-selector">
                <div className="project-selector-header">
                  <span>Select Default Project</span>
                  <button 
                    className="project-close-btn"
                    onClick={() => setShowProjectSelector(false)}
                  >
                    ×
                  </button>
                </div>
                {loadingProjects ? (
                  <div className="project-loading">Loading projects...</div>
                ) : (
                  <div className="project-list">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className={`project-item ${defaultProject?.id === project.id ? 'selected' : ''}`}
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="project-item-info">
                          <span className="project-item-name">{project.name}</span>
                          <span className="project-item-count">{project.documentCount} docs</span>
                        </div>
                        {defaultProject?.id === project.id && (
                          <span className="project-item-check">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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
