export function mimeToEnum(mimetype) {
  const enumValue = {
    "application/pdf": "PDF",
    "application/vnd.ms-excel": "EXCEL",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "EXCEL",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
}
return enumValue[mimetype] || "UNKNOWN";
};