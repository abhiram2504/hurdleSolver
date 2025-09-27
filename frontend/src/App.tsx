import React from "react";
import PdfUpload from "./components/PdfUpload";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-center mt-8">HurdleReader</h1>
      <PdfUpload />
    </div>
  );
}

export default App;
