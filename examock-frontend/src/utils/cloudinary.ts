// utils/cloudinary.ts
export const toCloudinaryDownloadUrl = (secureUrl: string, fileName?: string) => {
  // Cloudinary raw/upload URLs look like:
  // https://res.cloudinary.com/<cloud>/raw/upload/v123/examock/notes/.../file
  // Inserting fl_attachment right after /upload/ forces a Content-Disposition header.
  const flag = fileName ? `fl_attachment:${encodeURIComponent(fileName)}` : "fl_attachment";
  return secureUrl.replace("/upload/", `/upload/${flag}/`);
};