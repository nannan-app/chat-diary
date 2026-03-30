use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum MurmurError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Invalid password")]
    InvalidPassword,

    #[error("Invalid recovery code")]
    InvalidRecoveryCode,

    #[error("Not authenticated")]
    NotAuthenticated,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    Image(String),

    #[error("{0}")]
    General(String),
}

impl Serialize for MurmurError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
