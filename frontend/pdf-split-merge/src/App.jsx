import React, { useState } from "react";
import PDFMerger from "./components/PDFMerger";
import PDFSplitter from "./components/PDFSplitter";

function App() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-purple-100">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">PDF Tools</h1>

      <div className="w-96 p-8 bg-white rounded-3xl shadow-xl space-y-6 border border-gray-200">
        <button
          onClick={() => setActiveModal("merger")}
          className="w-full px-6 py-4 bg-blue-600 text-white text-md font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
        >
          Merge PDF
        </button>

        <button
          onClick={() => setActiveModal("splitter")}
          className="w-full px-6 py-4 bg-red-600 text-white text-md font-semibold rounded-xl shadow-md hover:bg-red-700 transition-all duration-200 transform hover:scale-105"
        >
          Split PDF
        </button>
      </div>

      {/* Modals */}
      {activeModal === "merger" && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              ✖
            </button>
            <PDFMerger isOpen={true} onClose={() => setActiveModal(null)} />
          </div>
        </div>
      )}

      {activeModal === "splitter" && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              ✖
            </button>
            <PDFSplitter isOpen={true} onClose={() => setActiveModal(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
