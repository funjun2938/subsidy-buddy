// 세션 스토리지 기반 파일 공유 (페이지 간 첨부파일 전달)
const KEY = "uploaded-biz-file";

interface StoredFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

export function storeFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const stored: StoredFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result as string,
      };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(stored));
        resolve();
      } catch {
        // 용량 초과 시 무시
        reject(new Error("파일이 너무 큽니다."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function retrieveFile(): File | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const stored: StoredFile = JSON.parse(raw);
    // base64 data URL → Blob → File
    const arr = stored.data.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || stored.type;
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], stored.name, { type: mime });
  } catch {
    return null;
  }
}

export function clearStoredFile() {
  sessionStorage.removeItem(KEY);
}
