import { createError } from "h3";
const FILESIZE_UNITS = ["B", "KB", "MB", "GB"];
export function ensureBlob(blob, options = {}) {
  if (!options.maxSize && !options.types?.length) {
    throw createError({
      statusCode: 400,
      message: "ensureBlob() requires at least one of maxSize or types to be set."
    });
  }
  if (options.maxSize) {
    const maxFileSizeBytes = fileSizeToBytes(options.maxSize);
    if (blob.size > maxFileSizeBytes) {
      throw createError({
        statusCode: 400,
        message: `File size must be less than ${options.maxSize}`
      });
    }
  }
  const blobShortType = blob.type.split("/")[0];
  if (options.types?.length && !options.types.includes(blob.type) && !options.types.includes(blobShortType) && !(options.types.includes("pdf") && blob.type === "application/pdf")) {
    throw createError({
      statusCode: 400,
      message: `File type is invalid, must be: ${options.types.join(", ")}`
    });
  }
}
function fileSizeToBytes(input) {
  const regex = new RegExp(
    `^(\\d+)(\\.\\d+)?\\s*(${FILESIZE_UNITS.join("|")})$`,
    "i"
  );
  const match = input.match(regex);
  if (!match) {
    throw createError({ statusCode: 400, message: `Invalid file size format: ${input}` });
  }
  const sizeValue = Number.parseFloat(match[1]);
  const sizeUnit = match[3].toUpperCase();
  if (!FILESIZE_UNITS.includes(sizeUnit)) {
    throw createError({ statusCode: 400, message: `Invalid file size unit: ${sizeUnit}` });
  }
  const bytes = sizeValue * Math.pow(1024, FILESIZE_UNITS.indexOf(sizeUnit));
  return Math.floor(bytes);
}
