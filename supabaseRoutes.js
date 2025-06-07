import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function sanitizeFileName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[^\w\-]/g, "").slice(0, 50);
}

function extractFileName(url, contentDisposition) {
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) return match[1].replace(/['"]/g, "");
  }
  try {
    const path = new URL(url).pathname;
    const segments = path.split("/");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment?.includes(".")) return lastSegment;
  } catch {}
  return null;
}

app.post("/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    const response = await fetch(url);
    if (!response.ok) return res.status(400).json({ error: "Failed to fetch file" });

    const contentType = response.headers.get("content-type") || "";
    const contentDisposition = response.headers.get("content-disposition");
    const ext = contentType.includes("pdf") ? ".pdf" : contentType.includes("word") ? ".docx" : "";
    if (!ext) return res.status(400).json({ error: "Unsupported file type" });

    const buffer = Buffer.from(await response.arrayBuffer());
    const originalName = extractFileName(url, contentDisposition) || `scraped${Date.now()}${ext}`;
    const cleanBaseName = sanitizeFileName(originalName);
    const fileName = `${cleanBaseName || "untitled"}${ext}`;

    const { error: uploadError } = await supabase.storage.from("cloud").upload(fileName, buffer, { contentType });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { error: dbError } = await supabase.from("documents").insert({
      filename: fileName,
      title: cleanBaseName || "untitled",
      classification: "Web",
      subcategory: "Scraped",
      size: buffer.length,
      status: "processed"
    });
    if (dbError) return res.status(500).json({ error: dbError.message });

    res.json({ message: "Success", filename: fileName });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing file" });

    const contentType = file.mimetype;
    const originalName = file.originalname;
    const ext = originalName.split(".").pop();
    const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^\w\-]/g, "").slice(0, 50);
    const fileName = `${baseName || "untitled"}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("cloud").upload(fileName, file.buffer, {
      contentType,
      upsert: false
    });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { error: dbError } = await supabase.from("documents").insert({
      filename: fileName,
      title: baseName || "untitled",
      classification: "Uncategorized",
      subcategory: "Unsorted",
      size: file.size,
      status: "processed"
    });
    if (dbError) return res.status(500).json({ error: dbError.message });

    res.json({ message: "Upload successful", filename: fileName });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

app.post("/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.length < 2) return res.status(400).json({ error: "Invalid search query" });

    const { data, error } = await supabase.from("documents")
      .select("id, title, filename, classification, uploaded_at, size, status")
      .ilike("title", `%${query}%`)
      .order("uploaded_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const terms = query.toLowerCase().split(/\s+/);
    const highlight = (text, terms) => text.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>");

    const results = data.map(doc => {
      const allText = `${doc.title} ${doc.filename}`;
      return {
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        classification: doc.classification,
        uploadDate: doc.uploaded_at,
        matchedKeywords: terms.filter(t => allText.toLowerCase().includes(t)),
        preview: `${doc.title} - ${doc.filename}`,
        highlightedPreview: highlight(`${doc.title} - ${doc.filename}`, terms)
      };
    });

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/classify", async (req, res) => {
  try {
    const { data, error } = await supabase.from("documents").select("id, title, filename");
    if (error) return res.status(500).json({ error: error.message });

    const categories = ["Education", "Business", "Health"];
    const subcategories = {
      Education: "Research Papers",
      Business: "Reports",
      Health: "Medical Records"
    };

    const updates = await Promise.all(data.map(async (doc, index) => {
      const category = categories[index % categories.length];
      const subcategory = subcategories[category];
      const confidence = 85 + Math.floor(Math.random() * 10);
      const keywords = doc.title.toLowerCase().split(" ").slice(0, 4);

      const { error: updateError } = await supabase.from("documents").update({
        classification: category,
        subcategory,
        confidence,
        keywords,
        status: "classified"
      }).eq("id", doc.id);

      if (updateError) console.error(`Update failed for ID ${doc.id}:`, updateError.message);

      return {
        id: doc.id,
        filename: doc.filename,
        title: doc.title,
        predictedCategory: category,
        predictedSubcategory: subcategory,
        confidence,
        keywords,
        status: "classified"
      };
    }));

    res.json({ results: updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
