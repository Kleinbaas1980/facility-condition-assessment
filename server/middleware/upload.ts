import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 5,
    fieldSize: 2 * 1024 * 1024,
  },
}).single("file");
