import React, { useState } from "react";

const PdfUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });
    alert("PDF uploaded!");
  };

  return (
    <div className="p-4 border rounded shadow w-full max-w-md mx-auto mt-8">
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleUpload}
        disabled={!file}
      >
        Upload PDF
      </button>
    </div>
  );
};

export default PdfUpload;
