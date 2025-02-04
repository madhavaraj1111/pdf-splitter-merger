import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";

function PDFSplitter({ isOpen, onClose }) {
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");
  const [file, setFile] = useState(null);
  const [totalPages, setTotalPages] = useState(null);
  const [error, setError] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [fileList, setFileList] = useState([]);

  const start = Number(startPage);
  const end = Number(endPage);

  const { getRootProps, getInputProps } = useDropzone({
    accept: ".pdf",
    maxSize: 10 * 1024 * 1024,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setError("Only PDF files are allowed.");
        return;
      }

      const selectedFile = acceptedFiles[0];
      if (selectedFile.type !== "application/pdf") {
        setError("Invalid file type. Please upload a PDF.");
        return;
      }

      setFile(selectedFile);
      setError("");
      setStartPage("");
      setEndPage("");
      setTotalPages(null);
      setDownloadLink(""); // Reset download link when a new file is uploaded
    },
  });

  useEffect(() => {
    fetch("https://pdf-splitter-merger-backend.onrender.com/files")
      .then((res) => res.json())
      .then((data) => {
        const filteredFiles = data.filter((file) => !file.isMerged); // Exclude merged files
        setFileList(filteredFiles);
      })
      .catch((err) => console.error("Error fetching files:", err));
  }, []);

  useEffect(() => {
    if (file) {
      const fetchPageCount = async () => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await axios.post(
            "https://pdf-splitter-merger-backend.onrender.com/get-pdf-pages",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
          setTotalPages(response.data.pageCount);
        } catch (error) {
          console.error("Error fetching PDF page count:", error);
          setError("Failed to retrieve PDF page count. Please try again.");
        }
      };

      fetchPageCount();
    }
  }, [file]);

  const splitPDF = async (file, selectedPages) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pages", JSON.stringify(selectedPages));

      const response = await fetch(
        "https://pdf-splitter-merger-backend.onrender.com/split-pdf",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.filePath) {
        // Store the split file path
        setDownloadLink(data.filePath);
      } else {
        console.error("Error splitting PDF:", data.error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Download function
  const downloadSplitPDF = async () => {
    try {
      const response = await fetch(downloadLink); // Use downloadLink instead
      const blob = await response.blob();
      const downloadURL = URL.createObjectURL(blob);

      const downloadElement = document.createElement("a");
      downloadElement.href = downloadURL;
      downloadElement.download = "split_document.pdf";
      document.body.appendChild(downloadElement);
      downloadElement.click();
      document.body.removeChild(downloadElement);

      URL.revokeObjectURL(downloadURL);
    } catch (error) {
      console.error("Download Error:", error);
    }
  };

  const handleSplit = async () => {
    if (!totalPages) {
      setError("Please wait until the PDF page count is fetched.");
      return;
    }

    const start = Number(startPage);
    const end = Number(endPage);

    if (isNaN(start) || isNaN(end)) {
      setError("Please enter valid start and end page numbers.");
      return;
    }

    if (start < 1 || end > totalPages || start > end) {
      setError(`Please select a valid page range between 1 and ${totalPages}.`);
      return;
    }
    const validPages = Array.from(
      { length: end - start + 1 },
      (_, i) => start + i
    );

    setSplitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pages", JSON.stringify(validPages));

      const response = await axios.post(
        "https://pdf-splitter-merger-backend.onrender.com/split-pdf",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Use the response file path to create the download link
      setDownloadLink(response.data.filePath); // ✅ CORRECT

      setSplitting(false);
    } catch (error) {
      setSplitting(false);
      if (error.response) {
        setError(`Error: ${error.response.data.error || "Unknown error"}`); // ✅ CORRECT
      } else {
        setError("Error splitting PDF. Please try again."); // ✅ CORRECT
      }
      console.error("Error splitting PDF:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="max-w-lg w-full p-8 bg-white rounded-2xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-xl font-bold"
        >
          &times;
        </button>

        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Split PDF
        </h3>

        <div
          {...getRootProps()}
          className="w-full p-5 mb-6 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer"
        >
          <input {...getInputProps()} />
          {file ? (
            <p className="text-gray-500">Selected File: {file.name}</p>
          ) : (
            <p className="text-gray-500">Drag & Drop a PDF File here</p>
          )}
        </div>

        {error && <p className="text-red-600 text-center">{error}</p>}

        <div className="space-y-6">
          <div className="relative">
            <input
              type="number"
              min="1"
              placeholder="Start page"
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              className="w-full px-5 py-3 text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-all duration-200"
            />
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              placeholder="End page"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              className="w-full px-5 py-3 text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-all duration-200"
            />
          </div>
          <button
            onClick={handleSplit}
            className={`w-full px-6 py-3 bg-gradient-to-r ${
              file && !splitting
                ? "from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                : "bg-gray-300 cursor-not-allowed"
            } text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg`}
            disabled={!file || !totalPages || splitting}
          >
            {splitting ? "Splitting..." : "Split PDF"}
          </button>

          {downloadLink && (
            <button
              onClick={downloadSplitPDF}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700"
            >
              Download Split PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PDFSplitter;
