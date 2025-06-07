import express from "express";
import supabaseRoutes from "./supabaseRoutes.js";

const app = express();
app.use("/api", supabaseRoutes);
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
