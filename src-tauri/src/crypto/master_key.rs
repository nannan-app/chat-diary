use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rand::rngs::OsRng;

use crate::error::MurmurError;
use super::{aes, argon2_kdf};

/// Generate a random 32-byte master key
pub fn generate() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::RngCore::fill_bytes(&mut OsRng, &mut key);
    key
}

/// Generate a human-readable recovery code (format: XXXX-XXXX-XXXX-XXXX-XXXX)
pub fn generate_recovery_code() -> String {
    let mut bytes = [0u8; 20];
    rand::RngCore::fill_bytes(&mut OsRng, &mut bytes);
    let encoded = BASE64.encode(bytes);
    // Take first 20 chars, split into groups of 4
    let chars: String = encoded
        .chars()
        .filter(|c| c.is_alphanumeric())
        .take(20)
        .collect::<String>()
        .to_uppercase();
    format!(
        "{}-{}-{}-{}-{}",
        &chars[0..4],
        &chars[4..8],
        &chars[8..12],
        &chars[12..16],
        &chars[16..20]
    )
}

/// Wrap (encrypt) the master key with a derived key
pub fn wrap(
    master_key: &[u8; 32],
    derived_key: &[u8; 32],
    nonce: &[u8; 12],
) -> Result<Vec<u8>, MurmurError> {
    aes::encrypt(derived_key, nonce, master_key)
}

/// Unwrap (decrypt) the master key with a derived key
pub fn unwrap(
    wrapped_key: &[u8],
    derived_key: &[u8; 32],
    nonce: &[u8; 12],
) -> Result<[u8; 32], MurmurError> {
    let decrypted = aes::decrypt(derived_key, nonce, wrapped_key)?;
    if decrypted.len() != 32 {
        return Err(MurmurError::Encryption(
            "Invalid master key length after unwrap".into(),
        ));
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&decrypted);
    Ok(key)
}

/// Complete setup: create master key, wrap with password and recovery code
pub struct SetupResult {
    pub master_key_by_password: Vec<u8>,
    pub master_key_by_recovery: Vec<u8>,
    pub password_salt: [u8; 16],
    pub recovery_salt: [u8; 16],
    pub password_nonce: [u8; 12],
    pub recovery_nonce: [u8; 12],
    pub master_key: [u8; 32],
    pub recovery_code: String,
}

pub fn setup(password: &str) -> Result<SetupResult, MurmurError> {
    let master_key = generate();
    let recovery_code = generate_recovery_code();

    let password_salt = argon2_kdf::generate_salt();
    let recovery_salt = argon2_kdf::generate_salt();
    let password_nonce = aes::generate_nonce();
    let recovery_nonce = aes::generate_nonce();

    let password_derived = argon2_kdf::derive_key(password, &password_salt)?;
    let recovery_derived = argon2_kdf::derive_key(&recovery_code, &recovery_salt)?;

    let master_key_by_password = wrap(&master_key, &password_derived, &password_nonce)?;
    let master_key_by_recovery = wrap(&master_key, &recovery_derived, &recovery_nonce)?;

    Ok(SetupResult {
        master_key_by_password,
        master_key_by_recovery,
        password_salt,
        recovery_salt,
        password_nonce,
        recovery_nonce,
        master_key,
        recovery_code,
    })
}

/// Try to unwrap master key with a password
pub fn try_unlock_with_password(
    password: &str,
    wrapped_key: &[u8],
    salt: &[u8; 16],
    nonce: &[u8; 12],
) -> Result<[u8; 32], MurmurError> {
    let derived = argon2_kdf::derive_key(password, salt)?;
    unwrap(wrapped_key, &derived, nonce)
}

/// Try to unwrap master key with a recovery code
pub fn try_unlock_with_recovery(
    recovery_code: &str,
    wrapped_key: &[u8],
    salt: &[u8; 16],
    nonce: &[u8; 12],
) -> Result<[u8; 32], MurmurError> {
    let derived = argon2_kdf::derive_key(recovery_code, salt)?;
    unwrap(wrapped_key, &derived, nonce)
}
