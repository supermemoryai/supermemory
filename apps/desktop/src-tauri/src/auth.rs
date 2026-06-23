use keyring::{Entry, Error as KeyringError};
use serde::Serialize;
use serde_json::Value;
use std::{
    process::Command,
    sync::{Mutex, OnceLock},
};

const KEYCHAIN_SERVICE: &str = "ai.supermemory.desktop";
const KEYCHAIN_USER: &str = "supermemory-api-token";
const KEYCHAIN_API_URL_USER: &str = "supermemory-api-url";
const DEFAULT_WEB_URL: &str = "https://app.supermemory.ai";
#[cfg(debug_assertions)]
const DEFAULT_API_URL: &str = "http://localhost:8787";

#[cfg(not(debug_assertions))]
const DEFAULT_API_URL: &str = "https://api.supermemory.ai";

static TOKEN_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static API_URL_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static PENDING_BROWSER_STATE: OnceLock<Mutex<Option<String>>> = OnceLock::new();

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub user_id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub api_url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthChangedEvent {
    pub authenticated: bool,
    pub api_url: Option<String>,
}

fn token_entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|error| format!("Could not open keychain entry: {error}"))
}

fn api_url_entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_API_URL_USER)
        .map_err(|error| format!("Could not open keychain API URL entry: {error}"))
}

fn token_cache() -> &'static Mutex<Option<String>> {
    TOKEN_CACHE.get_or_init(|| Mutex::new(None))
}

fn api_url_cache() -> &'static Mutex<Option<String>> {
    API_URL_CACHE.get_or_init(|| Mutex::new(None))
}

fn pending_browser_state() -> &'static Mutex<Option<String>> {
    PENDING_BROWSER_STATE.get_or_init(|| Mutex::new(None))
}

fn set_cached_token(token: Option<String>) -> Result<(), String> {
    let mut cached = token_cache()
        .lock()
        .map_err(|_| "Could not lock token cache".to_string())?;
    *cached = token;
    Ok(())
}

fn get_cached_token() -> Result<Option<String>, String> {
    token_cache()
        .lock()
        .map(|cached| cached.clone())
        .map_err(|_| "Could not lock token cache".to_string())
}

fn set_cached_api_url(api_url: Option<String>) -> Result<(), String> {
    let mut cached = api_url_cache()
        .lock()
        .map_err(|_| "Could not lock API URL cache".to_string())?;
    *cached = api_url;
    Ok(())
}

fn get_cached_api_url() -> Result<Option<String>, String> {
    api_url_cache()
        .lock()
        .map(|cached| cached.clone())
        .map_err(|_| "Could not lock API URL cache".to_string())
}

fn configured_api_url() -> String {
    if let Ok(api_url) = std::env::var("SUPERMEMORY_DESKTOP_API_URL") {
        return api_url;
    }

    if let Ok(api_url) = std::env::var("NEXT_PUBLIC_BACKEND_URL") {
        return api_url;
    }

    #[cfg(not(debug_assertions))]
    if let Ok(api_url) = std::env::var("SUPERMEMORY_API_URL") {
        return api_url;
    }

    DEFAULT_API_URL.to_string()
}

pub fn api_url() -> String {
    if let Ok(api_url) = std::env::var("SUPERMEMORY_DESKTOP_API_URL") {
        return api_url;
    }

    if let Ok(Some(api_url)) = get_stored_api_url() {
        return api_url;
    }

    configured_api_url()
}

pub fn web_url() -> String {
    std::env::var("SUPERMEMORY_DESKTOP_WEB_URL").unwrap_or_else(|_| DEFAULT_WEB_URL.to_string())
}

pub fn store_token(token: String) -> Result<(), String> {
    store_token_with_api_url(token, Some(configured_api_url()))
}

pub fn store_token_with_api_url(token: String, api_url: Option<String>) -> Result<(), String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("Token cannot be empty".to_string());
    }

    set_cached_token(Some(token.to_string()))?;

    token_entry()?
        .set_password(token)
        .map_err(|error| format!("Could not save token to keychain: {error}"))?;

    if let Some(api_url) = api_url {
        store_api_url(api_url)?;
    }

    Ok(())
}

pub fn get_token() -> Result<Option<String>, String> {
    match token_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(KeyringError::NoEntry) => get_cached_token(),
        Err(error) => Err(format!("Could not read token from keychain: {error}")),
    }
}

pub fn get_stored_api_url() -> Result<Option<String>, String> {
    match api_url_entry()?.get_password() {
        Ok(api_url) => Ok(Some(api_url)),
        Err(KeyringError::NoEntry) => get_cached_api_url(),
        Err(error) => Err(format!("Could not read API URL from keychain: {error}")),
    }
}

fn store_api_url(api_url: String) -> Result<(), String> {
    let api_url = normalize_base_url(&api_url)?;
    set_cached_api_url(Some(api_url.clone()))?;
    api_url_entry()?
        .set_password(&api_url)
        .map_err(|error| format!("Could not save API URL to keychain: {error}"))
}

pub fn clear_token() -> Result<(), String> {
    set_cached_token(None)?;
    set_cached_api_url(None)?;

    match token_entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(format!("Could not clear token from keychain: {error}")),
    }?;

    match api_url_entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(format!("Could not clear API URL from keychain: {error}")),
    }?;

    Ok(())
}

pub fn begin_browser_auth() -> Result<String, String> {
    let state = uuid::Uuid::new_v4().to_string();
    {
        let mut pending = pending_browser_state()
            .lock()
            .map_err(|_| "Could not lock browser auth state".to_string())?;
        *pending = Some(state.clone());
    }

    let login_url = build_browser_login_url(&state)?;
    open_system_browser(&login_url)?;
    Ok(login_url)
}

pub fn handle_deep_link(url: &str) -> Result<AuthChangedEvent, String> {
    let parsed =
        url::Url::parse(url).map_err(|error| format!("Invalid auth callback URL: {error}"))?;
    if parsed.scheme() != "supermemory" {
        return Err("Ignoring non-supermemory deep link".to_string());
    }

    let is_auth_callback =
        parsed.host_str() == Some("auth-callback") || parsed.path() == "/auth-callback";
    if !is_auth_callback {
        return Err("Ignoring unsupported supermemory deep link".to_string());
    }

    let params = parsed.query_pairs().collect::<Vec<_>>();
    let state = params
        .iter()
        .find_map(|(key, value)| (key == "state").then(|| value.to_string()))
        .ok_or_else(|| "Auth callback did not include state".to_string())?;
    let token = params
        .iter()
        .find_map(|(key, value)| (key == "token").then(|| value.to_string()))
        .ok_or_else(|| "Auth callback did not include token".to_string())?;
    let callback_api_url = params
        .iter()
        .find_map(|(key, value)| (key == "apiUrl").then(|| value.to_string()))
        .or_else(|| {
            params
                .iter()
                .find_map(|(key, value)| (key == "api_url").then(|| value.to_string()))
        });

    verify_browser_state(&state)?;
    store_token_with_api_url(token, callback_api_url)?;

    Ok(AuthChangedEvent {
        authenticated: true,
        api_url: Some(api_url()),
    })
}

pub fn is_auth_deep_link(url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(url) else {
        return false;
    };

    parsed.scheme() == "supermemory"
        && (parsed.host_str() == Some("auth-callback") || parsed.path() == "/auth-callback")
}

pub async fn whoami() -> Result<AuthSession, String> {
    let token = get_token()?.ok_or_else(|| "No stored token".to_string())?;
    let api_url = api_url();
    let session_url = format!("{}/v3/session", api_url.trim_end_matches('/'));

    let response = reqwest::Client::new()
        .get(&session_url)
        .header("Authorization", format!("Bearer {token}"))
        .header("X-App-Source", "desktop")
        .send()
        .await
        .map_err(|error| format!("Could not reach Supermemory API: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Session validation failed ({status}): {body}"));
    }

    let session = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Could not parse session response: {error}"))?;

    let user_id = first_string(
        &session,
        &[
            &["user", "id"],
            &["userId"],
            &["id"],
            &["session", "userId"],
            &["session", "user", "id"],
        ],
    )
    .ok_or_else(|| "Session response did not include a user id".to_string())?;

    Ok(AuthSession {
        user_id,
        email: first_string(&session, &[&["user", "email"], &["email"]]),
        name: first_string(&session, &[&["user", "name"], &["name"]]),
        api_url,
    })
}

fn build_browser_login_url(state: &str) -> Result<String, String> {
    let base = web_url();
    let mut url = url::Url::parse(&base)
        .or_else(|_| url::Url::parse(&format!("{}/", base.trim_end_matches('/'))))
        .map_err(|error| format!("Invalid Supermemory web URL: {error}"))?;
    url.set_path("login");
    url.query_pairs_mut()
        .append_pair("desktop-auth", "1")
        .append_pair("state", state);
    Ok(url.to_string())
}

fn open_system_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(url);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    };

    #[cfg(target_os = "linux")]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(url);
        command
    };

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open browser: {error}"))
}

fn verify_browser_state(state: &str) -> Result<(), String> {
    let mut pending = pending_browser_state()
        .lock()
        .map_err(|_| "Could not lock browser auth state".to_string())?;

    match pending.as_deref() {
        Some(expected) if expected == state => {
            *pending = None;
            Ok(())
        }
        Some(_) => Err("Auth callback state did not match".to_string()),
        None => Err("No browser auth request is pending".to_string()),
    }
}

fn normalize_base_url(api_url: &str) -> Result<String, String> {
    let api_url = api_url.trim().trim_end_matches('/').to_string();
    if api_url.is_empty() {
        return Err("API URL cannot be empty".to_string());
    }
    let parsed = url::Url::parse(&api_url).map_err(|error| format!("Invalid API URL: {error}"))?;
    match parsed.scheme() {
        "http" | "https" => Ok(api_url),
        scheme => Err(format!("Unsupported API URL scheme: {scheme}")),
    }
}

fn first_string(value: &Value, paths: &[&[&str]]) -> Option<String> {
    paths.iter().find_map(|path| {
        let found = path
            .iter()
            .try_fold(value, |current, key| current.get(key))?;
        found.as_str().map(ToString::to_string)
    })
}
