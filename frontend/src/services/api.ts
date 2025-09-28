// API service functions

const API_BASE_URL = "http://localhost:5002";

export class ApiService {
  static async uploadPdf(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  static async fetchHurdle(pdfId: string) {
    const response = await fetch(`${API_BASE_URL}/api/hurdle/${pdfId}`);
    const data = await response.json();
    return data;
  }

  static async submitAnswer(
    pdfId: string,
    answer: any,
    timeMs: number,
    isSkip: boolean = false
  ) {
    const response = await fetch(`${API_BASE_URL}/api/hurdle/${pdfId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: answer,
        time_ms: timeMs,
        skip: isSkip,
      }),
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  static async skipQuestion(pdfId: string, timeMs: number) {
    const response = await fetch(`${API_BASE_URL}/api/hurdle/${pdfId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skip: true,
        time_ms: timeMs,
      }),
    });
    
    const data = await response.json();
    return data;
  }

  static async queryDocument(pdfId: string, query: string) {
    const response = await fetch(`${API_BASE_URL}/api/query/${pdfId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim() }),
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  static async getPerformance(pdfId: string) {
    const response = await fetch(`${API_BASE_URL}/api/performance/${pdfId}`);
    const data = await response.json();
    return data;
  }

  static async getCompletionMessage(pdfId: string) {
    const response = await fetch(`${API_BASE_URL}/api/completion-message/${pdfId}`);
    const data = await response.json();
    return data;
  }

}
