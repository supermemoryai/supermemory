use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

const KEYCHAIN_SERVICE: &str = "ai.supermemory.desktop";
const KEYCHAIN_USER: &str = "supermemory-api-token";
const DEFAULT_API_URL: &str = "https://api.supermemory.ai";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub user_id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub api_url: String,
}

#[derive(Deserialize)]
struct SessionResponse {
    user: Option<SessionUser>,
}

#[derive(Deserialize)]
struct SessionUser {
    id: Option<String>,
    email: Option<String>,
    name: Option<String>,
}

fn token_entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|error| format!("Could not open keychain entry: {error}"))
}

fn api_url() -> String {
    std::env::var("SUPERMEMORY_API_URL")
        .or_else(|_| std::env::var("NEXT_PUBLIC_BACKEND_URL"))
        .unwrap_or_else(|_| DEFAULT_API_URL.to_string())
}

pub fn store_token(token: String) -> Result<(), String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("Token cannot be empty".to_string());
    }

    token_entry()?
        .set_password(token)
        .map_err(|error| format!("Could not save token to keychain: {error}"))
}

pub fn get_token() -> Result<Option<String>, String> {
    match token_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(format!("Could not read token from keychain: {error}")),
    }
}

pub fn clear_token() -> Result<(), String> {
    match token_entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(format!("Could not clear token from keychain: {error}")),
    }
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
        .json::<SessionResponse>()
        .await
        .map_err(|error| format!("Could not parse session response: {error}"))?;

    let user = session
        .user
        .ok_or_else(|| "Session response did not include a user".to_string())?;
    let user_id = user
        .id
        .ok_or_else(|| "Session response did not include a user id".to_string())?;

    Ok(AuthSession {
        user_id,
        email: user.email,
        name: user.name,
        api_url,
    })
}
