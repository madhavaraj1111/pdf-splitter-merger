import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function PDFMerger({ isOpen, onClose }) {
  const [fileList, setFileList] = useState([]); // List of uploaded files
  const [step, setStep] = useState("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [mergedFile, setMergedFile] = useState(null);

  // Fetch uploaded files from backend
  useEffect(() => {
    fetch("https://pdf-splitter-merger-backend.onrender.com/files")
      .then((res) => res.json())
      .catch((err) => console.error("Error fetching files:", err));
  }, []);

  // Handle file drop and upload
  const onDrop = useCallback((acceptedFiles) => {
    const pdfFiles = acceptedFiles.filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length !== acceptedFiles.length) {
      alert("Only PDF files are allowed.");
      return;
    }

    if (pdfFiles.length > 0) {
      const formData = new FormData();
      pdfFiles.forEach((file) => {
        formData.append("files", file);
      });

      fetch("https://pdf-splitter-merger-backend.onrender.com/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          setFileList((prevFiles) => [...prevFiles, ...data.files]);
        })
        .catch((err) => console.error("Error uploading files:", err));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: ".pdf",
  });

  // Handle drag-and-drop reordering
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedFiles = [...fileList];
    const [movedItem] = reorderedFiles.splice(result.source.index, 1);
    reorderedFiles.splice(result.destination.index, 0, movedItem);
    setFileList(reorderedFiles);
  };

  // Merge selected PDFs
  const mergePDFs = async () => {
    setIsLoading(true);
    const fileIds = fileList.map((file) => file._id); // Use MongoDB file IDs

    fetch("https://pdf-splitter-merger-backend.onrender.com/merge-pdfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMergedFile(data.mergedFile); // Store merged file details
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error merging PDFs:", err);
        setIsLoading(false);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="max-w-lg w-full p-8 bg-white rounded-2xl shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-xl font-bold"
        >
          &times;
        </button>

        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Merge PDFs
        </h3>

        {/* Upload Section */}
        {step === "upload" && (
          <>
            <div
              {...getRootProps()}
              className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer"
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-gray-700">Drop the PDFs here...</p>
              ) : (
                <p className="text-gray-500">
                  Drag & Drop PDFs or click to upload
                </p>
              )}
            </div>

            {/* Uploaded Files List */}
            {fileList.length > 0 && (
              <>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800">
                    Uploaded Files
                  </h4>
                  <ul className="space-y-2 mt-2">
                    {fileList.map((file, index) => (
                      <li
                        key={file._id}
                        className="px-4 py-2 bg-gray-100 rounded-lg flex justify-between items-center"
                      >
                        <span className="text-gray-700">{file.fileName}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setStep("reorder")}
                  className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
                >
                  OK
                </button>
              </>
            )}
          </>
        )}

        {/* Reorder Section */}
        {step === "reorder" && (
          <>
            <div className="flex justify-between">
              <h4 className="font-semibold text-gray-800 mb-4">Reorder PDFs</h4>
              <h5 className="font-semibold text-gray-500 text-sm">
                (Drag to reorder)
              </h5>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="files">
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 max-h-60 overflow-auto"
                  >
                    {fileList.map((file, index) => (
                      <Draggable
                        key={file._id}
                        draggableId={file._id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`px-4 py-2 bg-gray-100 rounded-lg flex justify-between items-center transition-all ${
                              snapshot.isDragging
                                ? "shadow-lg scale-105 bg-gray-200"
                                : ""
                            }`}
                          >
                            <span className="text-gray-700">
                              {file.fileName}
                            </span>
                            <span className="cursor-grab text-gray-500">☰</span>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>

            <button
              onClick={() => setStep("preview")}
              className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
            >
              Preview
            </button>
          </>
        )}

        {/* Merge Section */}
        {step === "preview" && (
          <>
            <h4 className="font-semibold text-gray-800 mb-4">Preview PDFs</h4>
            <ul className="space-y-2">
              {fileList.map((file) => (
                <li
                  key={file._id}
                  className="px-4 py-2 bg-gray-100 rounded-lg flex justify-between items-center"
                >
                  <span className="text-gray-700">{file.fileName}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={mergePDFs}
              className="mt-4 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? "Merging..." : "Merge PDFs"}
            </button>
          </>
        )}

        {/* Download Section */}
        {mergedFile && !isLoading && (
          <div className="mt-6 text-center">
            <button
              onClick={async () => {
                try {
                  const response = await fetch(
                    `https://pdf-splitter-merger-backend.onrender.com/uploads/${mergedFile.fileName}`
                  );
                  const blob = await response.blob();
                  const downloadURL = URL.createObjectURL(blob);

                  const downloadLink = document.createElement("a");
                  downloadLink.href = downloadURL;
                  downloadLink.download = mergedFile.fileName;
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);

                  URL.revokeObjectURL(downloadURL);
                } catch (error) {
                  console.error("❌ Download Error:", error);
                }
              }}
              className="w-full px-6 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700"
            >
              Download Merged PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PDFMerger;
