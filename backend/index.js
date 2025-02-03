require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 5000;

// 📌 MongoDB Connection with Retry Logic
const mongoURI = process.env.MONGO_URI;

const connectWithRetry = () => {
  mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
      console.error("❌ MongoDB Connection Failed:", err.message);
      setTimeout(connectWithRetry, 5000); // Retry after 5s
    });
};
connectWithRetry();

// 📌 Define Schema & Model
const FileSchema = new mongoose.Schema({
  fileName: String,
  filePath: String,
  uploadDate: { type: Date, default: Date.now },
  isMerged: { type: Boolean, default: false },
});
const File = mongoose.model("File", FileSchema);

// 📌 Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve static files

// 📌 Ensure `uploads/` folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 📌 Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// 📌 Upload PDFs
app.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = req.files.map((file) => ({
      fileName: file.originalname,
      filePath: file.path,
    }));

    const savedFiles = await File.insertMany(files);
    res
      .status(200)
      .json({ message: "Files uploaded successfully", files: savedFiles });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: "Error uploading files" });
  }
});

// 📌 Fetch All Files
app.get("/files", async (req, res) => {
  try {
    const files = await File.find({ isMerged: false }); // Only return non-merged files
    res.status(200).json(files);
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    res.status(500).json({ error: "Error fetching files" });
  }
});

// 📌 Merge PDFs
app.post("/merge-pdfs", async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || fileIds.length < 2) {
      return res
        .status(400)
        .json({ error: "At least two PDFs are required for merging" });
    }

    // Fetch files and ensure they are sorted based on `fileIds` order
    const files = await File.find({ _id: { $in: fileIds } });

    // Sort files based on the order they were sent from the frontend
    const sortedFiles = fileIds.map((id) =>
      files.find((file) => file._id.toString() === id)
    );

    const pdfDoc = await PDFDocument.create();

    for (const file of sortedFiles) {
      if (!file) continue; // Handle missing files (edge case)

      const fileBytes = fs.readFileSync(file.filePath);
      const existingPdf = await PDFDocument.load(fileBytes);
      const copiedPages = await pdfDoc.copyPages(
        existingPdf,
        existingPdf.getPages().map((_, idx) => idx)
      );
      copiedPages.forEach((page) => pdfDoc.addPage(page));
    }

    // Save merged PDF
    const mergedFileName = `merged-${Date.now()}.pdf`;
    const mergedFilePath = path.join("uploads", mergedFileName);
    fs.writeFileSync(mergedFilePath, await pdfDoc.save());

    // Store merged file in DB
    const mergedFile = await File.create({
      fileName: mergedFileName,
      filePath: mergedFilePath,
      isMerged: true,
    });

    // Delete original files
    for (const file of sortedFiles) {
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
      await File.findByIdAndDelete(file._id);
    }

    res.status(200).json({ message: "PDFs merged successfully", mergedFile });
  } catch (error) {
    console.error("❌ Merge Error:", error);
    res.status(500).json({ error: "Error merging PDFs" });
  }
});

// 📌 Endpoint to Split PDF
app.post("/split-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { pages } = req.body; // This will be a string, so parse it into an array
    if (!pages || pages.length === 0) {
      return res.status(400).json({ error: "No pages specified" });
    }

    const parsedPages = JSON.parse(pages); // Parse the JSON string into an array of numbers

    const filePath = req.file.path;
    const pdfBuffer = fs.readFileSync(filePath);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPages().length;

    // Validate if the pages fall within the valid range
    const validPages = parsedPages.filter(
      (page) => page > 0 && page <= totalPages
    );
    if (validPages.length === 0) {
      return res.status(400).json({ error: "Invalid page range" });
    }

    const newPdf = await PDFDocument.create();
    for (const pageNum of validPages) {
      const [page] = await newPdf.copyPages(pdfDoc, [pageNum - 1]); // Page numbers are 0-based
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const newFilePath = `uploads/split_${Date.now()}.pdf`;
    fs.writeFileSync(newFilePath, pdfBytes);

    // Return the file path to be used for download in the frontend
    res.json({
      message: "PDF split successfully",
      filePath: `http://localhost:5000/uploads/${path.basename(newFilePath)}`,
    });
  } catch (error) {
    console.error("Error splitting PDF:", error);
    res.status(500).json({ error: "Error splitting PDF. Please try again." });
  }
});

// 📌 Endpoint to Get PDF Page Count
app.post("/get-pdf-pages", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const pdfBuffer = fs.readFileSync(filePath);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPages().length;

    res.json({ pageCount }); // Send the page count back to the frontend
  } catch (error) {
    console.error("Error fetching PDF page count:", error);
    res.status(500).send("Error fetching PDF page count.");
  }
});

// 📌 Start Server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
