import express from "express";
import supabaseRoutes from "./supabaseRoutes.js"; // assuming saved from above

const app = express();
app.use("/api", supabaseRoutes);
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
