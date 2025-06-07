# Supabase Document API (Express.js Version)

This project provides an Express.js-based API. It includes endpoints to scrape, upload, search, and classify documents using Supabase storage and database.

---

## 📦 Features

* Upload documents via file form
* Scrape files from URLs and store in Supabase
* Search indexed documents by title
* Simulate document classification

---

## 🛠 Requirements

* Node.js v18+
* Supabase project with:

  * `cloud` storage bucket
  * `documents` table with appropriate columns
* `.env` file containing:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-org/supabase-doc-api.git
cd supabase-doc-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Rename `.env.example` file to `.env`

```bash
mv .env.example .env
```

Add your Supabase project URL and service role key to it (see example above).

### 4. Run the server

```bash
node index.js
```

---

## ⚙️ Supabase Setup

### 📁 Create Storage Bucket

* Go to [Supabase Dashboard](https://app.supabase.com/)
* Select your project → `Storage`
* Click `New bucket`
* Set bucket name: `cloud`
* Make it **public** or adjust RLS policies as needed

### 📄 Create `documents` Table

Run the following SQL in the Supabase SQL Editor:

```sql
create table public.documents (
  id uuid not null default gen_random_uuid(),
  filename text null,
  title text null,
  classification text null,
  subcategory text null,
  status text null default 'processing',
  size integer null,
  uploaded_at timestamp without time zone null default now(),
  confidence integer null,
  keywords text[] null,
  constraint documents_pkey primary key (id)
);
```

---

## 📂 API Endpoints

### POST `/scrape`

Scrapes a document from a remote URL and uploads it to Supabase.

```json
{
  "url": "https://example.com/file.pdf"
}
```

### POST `/upload`

Uploads a local file using multipart/form-data.

* Field: `file`

### POST `/search`

Searches documents by title.

```json
{
  "query": "machine learning"
}
```

### POST `/classify`

Simulates classification and updates documents in Supabase.

* No input needed.

---

## 📌 Notes

* Supported file types: `.pdf`, `.docx`
* Search is based on case-insensitive partial title match.
* Classification is randomized and not AI-based (for the assignment only).

---

## Made by:

* Mayar El Falougi - 220211605
* Nada Ahmed El Taweel - 220210204