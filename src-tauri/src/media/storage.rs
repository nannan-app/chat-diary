use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

use crate::crypto::file_crypto;
use crate::error::MurmurError;

/// Compute SHA-256 hash of data, return hex string
pub fn compute_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

/// Save encrypted image to media directory
pub fn save_encrypted(
    master_key: &[u8; 32],
    image_bytes: &[u8],
    media_dir: &Path,
    file_hash: &str,
) -> Result<PathBuf, MurmurError> {
    let file_path = media_dir.join(file_hash);
    file_crypto::encrypt_file(master_key, image_bytes, &file_path)?;
    Ok(file_path)
}

/// Load and decrypt image from media directory
pub fn load_decrypted(
    master_key: &[u8; 32],
    media_dir: &Path,
    file_hash: &str,
) -> Result<Vec<u8>, MurmurError> {
    let file_path = media_dir.join(file_hash);
    file_crypto::decrypt_file(master_key, &file_path)
}

/// Save unencrypted image (for public space)
pub fn save_plain(
    image_bytes: &[u8],
    media_dir: &Path,
    file_hash: &str,
) -> Result<PathBuf, MurmurError> {
    let file_path = media_dir.join(file_hash);
    std::fs::write(&file_path, image_bytes)?;
    Ok(file_path)
}

/// Load unencrypted image (for public space)
pub fn load_plain(
    media_dir: &Path,
    file_hash: &str,
) -> Result<Vec<u8>, MurmurError> {
    let file_path = media_dir.join(file_hash);
    Ok(std::fs::read(file_path)?)
}
