const cloudinary = require('cloudinary').v2;

function configurar() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary não configurado. Defina CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
}

function uploadBuffer(buffer, { nome = 'imagem' } = {}) {
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve({
      url: `https://res.cloudinary.com/test/image/upload/game-and-cell/${encodeURIComponent(nome)}.webp`,
      tamanho: buffer.length,
      publicId: `game-and-cell/${nome}`
    });
  }

  configurar();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || 'game-and-cell',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        filename_override: nome,
        overwrite: false
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, tamanho: result.bytes, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBuffer };
