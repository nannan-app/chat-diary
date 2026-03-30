use argon2::{Argon2, PasswordHasher, password_hash::SaltString};
use rand::rngs::OsRng;

use crate::error::MurmurError;

/// Generate a random 16-byte salt
pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    rand::RngCore::fill_bytes(&mut OsRng, &mut salt);
    salt
}

/// Derive a 32-byte key from password + salt using Argon2id
pub fn derive_key(password: &str, salt: &[u8; 16]) -> Result<[u8; 32], MurmurError> {
    use argon2::PasswordHash;

    let argon2 = Argon2::default();
    let salt_string = SaltString::encode_b64(salt)
        .map_err(|e| MurmurError::Encryption(format!("Salt encoding error: {}", e)))?;

    let hash = argon2
        .hash_password(password.as_bytes(), &salt_string)
        .map_err(|e| MurmurError::Encryption(format!("Argon2 error: {}", e)))?;

    let hash_string = hash.to_string();
    let hash_output = PasswordHash::new(hash_string.as_str())
        .map_err(|e| MurmurError::Encryption(format!("Hash parse error: {}", e)))?;

    let hash_bytes = hash_output
        .hash
        .ok_or_else(|| MurmurError::Encryption("No hash output".into()))?;

    let bytes = hash_bytes.as_bytes();
    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes[..32]);
    Ok(key)
}
