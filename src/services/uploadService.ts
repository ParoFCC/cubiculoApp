import api from "./api";

export const uploadService = {
  /**
   * Upload a file to Cloudinary via the backend /upload endpoint.
   * @returns The secure Cloudinary URL of the uploaded file.
   */
  uploadFile: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const { data } = await api.post<{ url: string; filename: string }>(
      "/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.url;
  },
};
