use image::GenericImageView;
use std::io::Cursor;

use crate::error::MurmurError;

const THUMBNAIL_MAX_SIZE: u32 = 200;

/// Generate a JPEG thumbnail from image bytes, max 200px on longest side
pub fn generate(image_bytes: &[u8]) -> Result<(Vec<u8>, u32, u32), MurmurError> {
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| MurmurError::Image(format!("Failed to decode image: {}", e)))?;

    let (width, height) = img.dimensions();
    let thumbnail = img.thumbnail(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE);

    let mut buf = Cursor::new(Vec::new());
    thumbnail
        .write_to(&mut buf, image::ImageFormat::Jpeg)
        .map_err(|e| MurmurError::Image(format!("Failed to encode thumbnail: {}", e)))?;

    Ok((buf.into_inner(), width, height))
}
