use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    io::{BufRead, BufReader, Write},
    net::TcpListener,
    process::Command,
    sync::{Mutex, OnceLock},
    thread,
    time::Duration,
};

const KEYCHAIN_SERVICE: &str = "ai.supermemory.desktop";
const KEYCHAIN_USER: &str = "supermemory-api-token";
const KEYCHAIN_API_URL_USER: &str = "supermemory-api-url";
const DEFAULT_WEB_URL: &str = "https://app.supermemory.ai";
#[cfg(not(debug_assertions))]
const DEFAULT_BROWSER_API_URL: &str = "https://api.supermemory.ai";
const BROWSER_AUTH_TIMEOUT: Duration = Duration::from_secs(120);
#[cfg(debug_assertions)]
const DEFAULT_API_URL: &str = "http://localhost:8787";

#[cfg(not(debug_assertions))]
const DEFAULT_API_URL: &str = "https://api.supermemory.ai";

static TOKEN_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static API_URL_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static PENDING_BROWSER_AUTH: OnceLock<Mutex<Option<PendingBrowserAuth>>> = OnceLock::new();

#[derive(Clone)]
struct PendingBrowserAuth {
    state: String,
    finish_url: String,
}

struct DesktopAuthRequest {
    finish_url: String,
}

#[derive(Deserialize)]
struct SocialSignInResponse {
    url: String,
}

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

fn pending_browser_auth() -> &'static Mutex<Option<PendingBrowserAuth>> {
    PENDING_BROWSER_AUTH.get_or_init(|| Mutex::new(None))
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

fn browser_auth_api_url() -> String {
    if let Ok(api_url) = std::env::var("SUPERMEMORY_DESKTOP_API_URL") {
        return api_url;
    }

    #[cfg(debug_assertions)]
    {
        configured_api_url()
    }

    #[cfg(not(debug_assertions))]
    {
        if std::env::var("SUPERMEMORY_DESKTOP_WEB_URL").is_ok() {
            return configured_api_url();
        }

        DEFAULT_BROWSER_API_URL.to_string()
    }
}

fn is_loopback_http_url(value: &str) -> bool {
    url::Url::parse(value)
        .map(|url| {
            url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1"))
        })
        .unwrap_or(false)
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

pub fn begin_browser_auth<F>(on_complete: F) -> Result<String, String>
where
    F: FnOnce(Result<AuthChangedEvent, String>) + Send + 'static,
{
    let request = create_desktop_auth_request(on_complete)?;
    let login_url = build_browser_login_url_from_finish_url(&request.finish_url)?;
    open_system_browser(&login_url)?;
    Ok(login_url)
}

pub async fn begin_social_auth<F>(provider: String, on_complete: F) -> Result<String, String>
where
    F: FnOnce(Result<AuthChangedEvent, String>) + Send + 'static,
{
    let provider = match provider.as_str() {
        "google" | "github" => provider,
        _ => return Err("Unsupported social sign-in provider".to_string()),
    };

    let request = create_desktop_auth_request(on_complete)?;
    let api_url = browser_auth_api_url();
    let sign_in_url = format!("{}/api/auth/sign-in/social", api_url.trim_end_matches('/'));
    let response = reqwest::Client::new()
        .post(&sign_in_url)
        .header("Content-Type", "application/json")
        .header("X-App-Source", "desktop")
        .json(&serde_json::json!({
            "provider": provider,
            "callbackURL": request.finish_url,
            "newUserCallbackURL": request.finish_url,
            "errorCallbackURL": request.finish_url,
        }))
        .send()
        .await
        .map_err(|error| format!("Could not start {provider} sign-in: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Could not start {provider} sign-in ({status}): {body}"
        ));
    }

    let sign_in = response
        .json::<SocialSignInResponse>()
        .await
        .map_err(|error| format!("Could not parse {provider} sign-in response: {error}"))?;

    open_system_browser(&sign_in.url)?;
    Ok(sign_in.url)
}

pub async fn send_magic_link<F>(email: String, on_complete: F) -> Result<(), String>
where
    F: FnOnce(Result<AuthChangedEvent, String>) + Send + 'static,
{
    let email = email.trim().to_string();
    if email.is_empty() {
        return Err("Email cannot be empty".to_string());
    }

    let request = create_desktop_auth_request(on_complete)?;
    let api_url = browser_auth_api_url();
    let magic_link_url = format!(
        "{}/api/auth/sign-in/magic-link",
        api_url.trim_end_matches('/')
    );
    let response = reqwest::Client::new()
        .post(&magic_link_url)
        .header("Content-Type", "application/json")
        .header("X-App-Source", "desktop")
        .json(&serde_json::json!({
            "email": email,
            "callbackURL": request.finish_url,
            "newUserCallbackURL": request.finish_url,
            "errorCallbackURL": request.finish_url,
        }))
        .send()
        .await
        .map_err(|error| format!("Could not send login link: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Could not send login link ({status}): {body}"));
    }

    Ok(())
}

pub fn verify_magic_link_token(token: String) -> Result<String, String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("Login code cannot be empty".to_string());
    }

    let finish_url = pending_finish_url()?;
    let api_url = browser_auth_api_url();
    let mut verify_url = url::Url::parse(&format!(
        "{}/api/auth/magic-link/verify",
        api_url.trim_end_matches('/')
    ))
    .map_err(|error| format!("Invalid magic link verification URL: {error}"))?;
    verify_url
        .query_pairs_mut()
        .append_pair("token", token)
        .append_pair("callbackURL", &finish_url)
        .append_pair("errorCallbackURL", &finish_url);

    let verify_url = verify_url.to_string();
    open_system_browser(&verify_url)?;
    Ok(verify_url)
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

    complete_browser_auth(parsed)?;

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

fn handle_loopback_callback(url: &str) -> Result<AuthChangedEvent, String> {
    let parsed =
        url::Url::parse(url).map_err(|error| format!("Invalid auth callback URL: {error}"))?;
    if parsed.scheme() != "http" {
        return Err("Auth callback must use HTTP loopback".to_string());
    }

    let is_loopback = matches!(parsed.host_str(), Some("127.0.0.1") | Some("localhost"));
    if !is_loopback || parsed.path() != "/callback" {
        return Err("Ignoring unsupported loopback auth callback".to_string());
    }

    complete_browser_auth(parsed)?;

    Ok(AuthChangedEvent {
        authenticated: true,
        api_url: Some(api_url()),
    })
}

fn create_desktop_auth_request<F>(on_complete: F) -> Result<DesktopAuthRequest, String>
where
    F: FnOnce(Result<AuthChangedEvent, String>) + Send + 'static,
{
    let state = uuid::Uuid::new_v4().to_string();
    let port = start_loopback_auth_server(on_complete)?;
    let callback_url = build_loopback_callback_url(&state, port)?;
    let finish_url = build_desktop_finish_url(&callback_url)?;

    {
        let mut pending = pending_browser_auth()
            .lock()
            .map_err(|_| "Could not lock browser auth state".to_string())?;
        *pending = Some(PendingBrowserAuth {
            state,
            finish_url: finish_url.clone(),
        });
    }

    Ok(DesktopAuthRequest { finish_url })
}

fn build_loopback_callback_url(state: &str, callback_port: u16) -> Result<String, String> {
    let mut callback = url::Url::parse(&format!("http://127.0.0.1:{callback_port}/callback"))
        .map_err(|error| format!("Invalid desktop callback URL: {error}"))?;
    callback
        .query_pairs_mut()
        .append_pair("state", state)
        .append_pair("api_url", &browser_auth_api_url());
    Ok(callback.to_string())
}

fn build_desktop_finish_url(callback_url: &str) -> Result<String, String> {
    let api_url = browser_auth_api_url();
    let use_local_api_finish =
        std::env::var("SUPERMEMORY_DESKTOP_WEB_URL").is_err() && is_loopback_http_url(&api_url);
    let base = if use_local_api_finish {
        api_url.clone()
    } else {
        web_url()
    };
    let mut url = url::Url::parse(&base)
        .or_else(|_| url::Url::parse(&format!("{}/", base.trim_end_matches('/'))))
        .map_err(|error| format!("Invalid Supermemory auth finish URL: {error}"))?;
    url.set_path(if use_local_api_finish {
        "v3/auth/desktop/callback"
    } else {
        "api/auth/desktop/callback"
    });

    let cwd = std::env::current_dir()
        .ok()
        .and_then(|path| path.to_str().map(ToString::to_string))
        .unwrap_or_default();

    url.query_pairs_mut()
        .append_pair("callback", callback_url)
        .append_pair("api_url", &api_url)
        .append_pair("hostname", "Supermemory Desktop")
        .append_pair("os", std::env::consts::OS)
        .append_pair("cwd", &cwd)
        .append_pair("version", env!("CARGO_PKG_VERSION"));
    Ok(url.to_string())
}

fn build_browser_login_url_from_finish_url(finish_url: &str) -> Result<String, String> {
    let base = web_url();
    let mut url = url::Url::parse(&base)
        .or_else(|_| url::Url::parse(&format!("{}/", base.trim_end_matches('/'))))
        .map_err(|error| format!("Invalid Supermemory web URL: {error}"))?;
    url.set_path("login");
    url.query_pairs_mut().append_pair("redirect", finish_url);
    Ok(url.to_string())
}

#[cfg(test)]
fn build_browser_login_url(state: &str, callback_port: u16) -> Result<String, String> {
    let callback_url = build_loopback_callback_url(state, callback_port)?;
    build_desktop_finish_url(&callback_url)
}

fn pending_finish_url() -> Result<String, String> {
    pending_browser_auth()
        .lock()
        .map_err(|_| "Could not lock browser auth state".to_string())?
        .as_ref()
        .map(|pending| pending.finish_url.clone())
        .ok_or_else(|| "No browser auth request is pending".to_string())
}

fn start_loopback_auth_server<F>(on_complete: F) -> Result<u16, String>
where
    F: FnOnce(Result<AuthChangedEvent, String>) + Send + 'static,
{
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Could not start auth callback server: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| format!("Could not configure auth callback server: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("Could not read auth callback server port: {error}"))?
        .port();

    thread::spawn(move || {
        let started = std::time::Instant::now();
        loop {
            if started.elapsed() > BROWSER_AUTH_TIMEOUT {
                on_complete(Err("Browser sign-in timed out".to_string()));
                return;
            }

            match listener.accept() {
                Ok((mut stream, _addr)) => {
                    let path = match read_loopback_request_path(&mut stream) {
                        Ok(path) => path,
                        Err(error) => {
                            write_loopback_response(
                                &mut stream,
                                400,
                                "Authentication failed",
                                &error,
                            );
                            on_complete(Err(error));
                            return;
                        }
                    };

                    if !is_loopback_callback_path(&path) {
                        write_loopback_response(
                            &mut stream,
                            404,
                            "Supermemory authentication",
                            "Not found.",
                        );
                        continue;
                    }

                    let callback_url = format!("http://127.0.0.1:{port}{path}");
                    let result = handle_loopback_callback(&callback_url);
                    match &result {
                        Ok(_) => write_loopback_response(
                            &mut stream,
                            200,
                            "You are authenticated",
                            "You can close this window and go back to Supermemory.",
                        ),
                        Err(error) => {
                            write_loopback_response(
                                &mut stream,
                                400,
                                "Authentication failed",
                                error,
                            );
                        }
                    }
                    on_complete(result);
                    return;
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(100));
                }
                Err(error) => {
                    on_complete(Err(format!("Auth callback server failed: {error}")));
                    return;
                }
            }
        }
    });

    Ok(port)
}

fn read_loopback_request_path(stream: &mut std::net::TcpStream) -> Result<String, String> {
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader
        .read_line(&mut request_line)
        .map_err(|error| format!("Could not read auth callback request: {error}"))?;

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let path = parts.next().unwrap_or_default();
    if method != "GET" || path.is_empty() {
        return Err("Invalid auth callback request".to_string());
    }

    Ok(path.to_string())
}

fn is_loopback_callback_path(path: &str) -> bool {
    path == "/callback" || path.starts_with("/callback?")
}

fn write_loopback_response(
    stream: &mut std::net::TcpStream,
    status: u16,
    title: &str,
    message: &str,
) {
    let escaped_title = escape_html(title);
    let escaped_message = escape_html(message);
    let status_text = if status == 200 { "OK" } else { "Bad Request" };
    let body = format!(
        "<!doctype html><html><head><title>{escaped_title}</title></head><body style=\"font-family: system-ui; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #030912; color: #fafafa;\"><main style=\"text-align: center; max-width: 420px;\"><h1>{escaped_title}</h1><p style=\"color: #a3a3a3;\">{escaped_message}</p></main></body></html>"
    );
    let response = format!(
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn complete_browser_auth(parsed: url::Url) -> Result<(), String> {
    let params = parsed.query_pairs().collect::<Vec<_>>();
    let state = params
        .iter()
        .find_map(|(key, value)| (key == "state").then(|| value.to_string()))
        .ok_or_else(|| "Auth callback did not include state".to_string())?;
    verify_browser_state(&state)?;

    if let Some(error) = params
        .iter()
        .find_map(|(key, value)| (key == "error").then(|| value.to_string()))
    {
        return Err(format!("Browser sign-in failed: {error}"));
    }

    let api_key = params
        .iter()
        .find_map(|(key, value)| (key == "apikey").then(|| value.to_string()))
        .or_else(|| {
            params
                .iter()
                .find_map(|(key, value)| (key == "apiKey").then(|| value.to_string()))
        })
        .or_else(|| {
            params
                .iter()
                .find_map(|(key, value)| (key == "token").then(|| value.to_string()))
        })
        .ok_or_else(|| "Auth callback did not include API key".to_string())?;
    let callback_api_url = params
        .iter()
        .find_map(|(key, value)| (key == "apiUrl").then(|| value.to_string()))
        .or_else(|| {
            params
                .iter()
                .find_map(|(key, value)| (key == "api_url").then(|| value.to_string()))
        });

    store_token_with_api_url(
        api_key,
        callback_api_url.or_else(|| Some(browser_auth_api_url())),
    )
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
    let mut pending = pending_browser_auth()
        .lock()
        .map_err(|_| "Could not lock browser auth state".to_string())?;

    match pending.as_ref() {
        Some(expected) if expected.state == state => {
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

#[cfg(test)]
mod tests {
    use super::*;

    static TEST_ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn browser_auth_url_uses_desktop_finish_callback_flow() {
        let _guard = TEST_ENV_LOCK.lock().unwrap();
        std::env::remove_var("SUPERMEMORY_DESKTOP_WEB_URL");
        std::env::remove_var("SUPERMEMORY_DESKTOP_API_URL");
        std::env::remove_var("NEXT_PUBLIC_BACKEND_URL");

        let url = url::Url::parse(&build_browser_login_url("state-123", 49876).unwrap()).unwrap();
        assert_eq!(
            url.as_str().split('?').next().unwrap(),
            "http://localhost:8787/v3/auth/desktop/callback"
        );
        assert_eq!(
            url.query_pairs()
                .find(|(key, _)| key == "hostname")
                .unwrap()
                .1,
            "Supermemory Desktop"
        );
        assert_eq!(
            url.query_pairs()
                .find(|(key, _)| key == "api_url")
                .unwrap()
                .1,
            DEFAULT_API_URL
        );
        assert!(url.query_pairs().all(|(key, _)| key != "client"));

        let callback = url
            .query_pairs()
            .find_map(|(key, value)| (key == "callback").then(|| value.to_string()))
            .unwrap();
        let callback = url::Url::parse(&callback).unwrap();

        assert_eq!(callback.scheme(), "http");
        assert_eq!(callback.host_str(), Some("127.0.0.1"));
        assert_eq!(callback.port(), Some(49876));
        assert_eq!(callback.path(), "/callback");
        assert_eq!(
            callback
                .query_pairs()
                .find(|(key, _)| key == "state")
                .unwrap()
                .1,
            "state-123"
        );
        assert_eq!(
            callback
                .query_pairs()
                .find(|(key, _)| key == "api_url")
                .unwrap()
                .1,
            DEFAULT_API_URL
        );
    }

    #[test]
    fn browser_auth_url_uses_web_finish_when_web_url_is_overridden() {
        let _guard = TEST_ENV_LOCK.lock().unwrap();
        std::env::set_var("SUPERMEMORY_DESKTOP_WEB_URL", "https://app.supermemory.ai");
        std::env::remove_var("SUPERMEMORY_DESKTOP_API_URL");
        std::env::remove_var("NEXT_PUBLIC_BACKEND_URL");

        let url = url::Url::parse(&build_browser_login_url("state-123", 49876).unwrap()).unwrap();
        assert_eq!(
            url.as_str().split('?').next().unwrap(),
            "https://app.supermemory.ai/api/auth/desktop/callback"
        );
        assert_eq!(
            url.query_pairs()
                .find(|(key, _)| key == "api_url")
                .unwrap()
                .1,
            DEFAULT_API_URL
        );

        std::env::remove_var("SUPERMEMORY_DESKTOP_WEB_URL");
    }

    #[test]
    fn auth_deep_link_recognizes_legacy_callback_shape() {
        assert!(is_auth_deep_link(
            "supermemory://auth-callback?state=state-123&apikey=sm_test"
        ));
        assert!(!is_auth_deep_link(
            "https://console.supermemory.ai/auth/connect?state=state-123"
        ));
    }

    #[test]
    fn loopback_response_escapes_browser_visible_text() {
        assert_eq!(
            escape_html("<script>alert('x')</script>"),
            "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"
        );
    }

    #[test]
    fn loopback_callback_path_must_match_callback_route() {
        assert!(is_loopback_callback_path("/callback"));
        assert!(is_loopback_callback_path("/callback?state=state-123"));
        assert!(!is_loopback_callback_path(
            "/callback-extra?state=state-123"
        ));
        assert!(!is_loopback_callback_path("/favicon.ico"));
    }
}
