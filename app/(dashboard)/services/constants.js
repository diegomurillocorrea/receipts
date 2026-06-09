/** Bucket público para las imágenes de los servicios */
export const SERVICE_IMAGE_BUCKET = "service-images";

/** Tipos de imagen permitidos para la imagen del servicio */
export const SERVICE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** Tamaño máximo de la imagen del servicio (5 MB) */
export const SERVICE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
