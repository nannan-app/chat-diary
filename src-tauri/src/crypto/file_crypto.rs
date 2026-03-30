use std::path::Path;

use crate::error::MurmurError;
use super::aes;

/// Encrypt file contents and write to disk
/// File format: [12-byte nonce][ciphertext]
pub fn encrypt_file(
    master_key: &[u8; 32],
    plaintext: &[u8],
    output_path: &Path,
) -> Result<(), MurmurError> {
    let nonce = aes::generate_nonce();
    let ciphertext = aes::encrypt(master_key, &nonce, plaintext)?;

    let mut data = Vec::with_capacity(12 + ciphertext.len());
    data.extend_from_slice(&nonce);
    data.extend_from_slice(&ciphertext);

    std::fs::write(output_path, &data)?;
    Ok(())
}

/// Read encrypted file from disk and decrypt
pub fn decrypt_file(
    master_key: &[u8; 32],
    input_path: &Path,
) -> Result<Vec<u8>, MurmurError> {
    let data = std::fs::read(input_path)?;
    if data.len() < 12 {
        return Err(MurmurError::Encryption("File too short".into()));
    }

    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&data[..12]);
    let ciphertext = &data[12..];

    aes::decrypt(master_key, &nonce, ciphertext)
}
