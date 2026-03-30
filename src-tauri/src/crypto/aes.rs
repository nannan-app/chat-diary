use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::rngs::OsRng;

use crate::error::MurmurError;

/// Generate a random 12-byte nonce for AES-256-GCM
pub fn generate_nonce() -> [u8; 12] {
    let mut nonce = [0u8; 12];
    rand::RngCore::fill_bytes(&mut OsRng, &mut nonce);
    nonce
}

/// Encrypt plaintext with AES-256-GCM
pub fn encrypt(key: &[u8; 32], nonce: &[u8; 12], plaintext: &[u8]) -> Result<Vec<u8>, MurmurError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| MurmurError::Encryption(format!("AES key error: {}", e)))?;
    let nonce = Nonce::from_slice(nonce);
    cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| MurmurError::Encryption(format!("AES encrypt error: {}", e)))
}

/// Decrypt ciphertext with AES-256-GCM
pub fn decrypt(key: &[u8; 32], nonce: &[u8; 12], ciphertext: &[u8]) -> Result<Vec<u8>, MurmurError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| MurmurError::Encryption(format!("AES key error: {}", e)))?;
    let nonce = Nonce::from_slice(nonce);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| MurmurError::Encryption(format!("AES decrypt error: {}", e)))
}
