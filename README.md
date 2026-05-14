# DocChat — AI RAG Chatbot
### Python · Flask · Gemini AI · HTML · CSS · JavaScript

An AI-powered chatbot that answers questions from your uploaded documents using **Retrieval-Augmented Generation (RAG)**.

---

## Live Demo
🔗 [https://your-app-name.onrender.com](https://your-app-name.onrender.com)
*(Replace with your actual Render URL after deployment)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Flask |
| AI Model | Google Gemini 2.5 Flash |
| RAG Pipeline | TF-IDF (scikit-learn) + Cosine Similarity |
| PDF Reading | PyMuPDF + PyPDF2 |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Deployment | Render.com (free tier) |

---

## Features

- Upload multiple files (PDF, DOCX, TXT, CSV, MD)
- Ask questions about any uploaded document
- Focus chat on one specific file by clicking it
- Delete individual files or clear all
- Conversation history for multi-turn chat
- Source badges show which file answered your question
- Works with scanned PDFs (PyMuPDF)
- Fully responsive dark UI

---

## Project Structure

rag-chatbot/
├── app.py               ← Flask server + API routes
├── rag_engine.py        ← RAG pipeline (extract, chunk, retrieve, answer)
├── requirements.txt     ← Python dependencies
├── render.yaml          ← Render.com deploy config
├── .env                 ← Your API key (never commit this)
├── .env.example         ← Template for API key
├── .gitignore           ← Ignores .env, venv, uploads
├── README.md            ← This file
├── templates/
│   └── index.html       ← Chat UI
└── static/
├── css/
│   └── style.css    ← All styles
└── js/
└── app.js       ← All frontend JavaScript

---

## How RAG Works
User uploads PDF / DOCX / TXT / CSV
↓
Extract text from file
(PyMuPDF → PyPDF2 → plain text fallback)
↓
Split into 300-word overlapping chunks
↓
Build TF-IDF index (scikit-learn)
↓
Store chunks in memory
User asks a question
↓
Convert question → TF-IDF vector
↓
Cosine similarity vs all stored chunks
↓
Retrieve top 6 most relevant chunks
↓
Send chunks + question → Gemini 2.5 Flash
↓
Return accurate, document-grounded answer

---

## Local Setup

### Prerequisites
- Python 3.10 or higher → [python.org](https://python.org)
- Gemini API key → [aistudio.google.com](https://aistudio.google.com)
- Git → [git-scm.com](https://git-scm.com)

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/rag-chatbot.git
cd rag-chatbot
```

### Step 2 — Create virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Add your Gemini API key

```bash
cp .env.example .env
```

Open `.env` and paste your key:
GEMINI_API_KEY=paste-your-key-here

Get your free key at → [aistudio.google.com](https://aistudio.google.com)

### Step 5 — Run

```bash
python app.py
```

Open browser at **http://localhost:5000**

---

## Deploy on Render (Free Public URL)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rag-chatbot.git
git push -u origin main
```

### Step 2 — Deploy on Render

1. Go to [render.com](https://render.com) → sign up free
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Render auto-reads `render.yaml` — all settings pre-filled
5. Under **Environment Variables** add:
   - Key: `GEMINI_API_KEY`
   - Value: your Gemini API key
6. Click **Create Web Service**
7. Wait ~3 minutes for build
8. Your app is live at `https://rag-chatbot-xxxx.onrender.com` ✅

---

## API Endpoints

| Method | URL | Description |
|---|---|---|
| GET | `/` | Serves the chat UI |
| POST | `/api/upload` | Upload and index a document |
| POST | `/api/chat` | Ask a question, get AI answer |
| GET | `/api/documents` | List all loaded documents |
| DELETE | `/api/documents/<filename>` | Delete one specific document |
| DELETE | `/api/documents` | Clear all documents |
| GET | `/health` | Health check for Render |

---

## Supported File Types

| File Type | Support |
|---|---|
| PDF (text-based) | ✅ Full support |
| PDF (scanned/image) | ✅ PyMuPDF handles most |
| DOCX (Word) | ✅ Full support including tables |
| TXT / Markdown | ✅ Full support |
| CSV | ✅ Full support |
| JSON / HTML / code files | ✅ Treated as plain text |

---

## Usage Guide

### Upload files
- Click the upload box or drag and drop files
- Multiple files can be uploaded
- Each file shows chunk count after processing

### Ask questions
- Type your question and press Enter
- AI answers based on uploaded documents
- Source badges show which file was used

### Focus on one file
- Click any file in the sidebar to filter
- Questions will only search that specific file
- Click the same file again to search all files

### Delete files
- Click ✕ on any file to remove it
- Click "Clear all" to remove everything

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key |
| `FLASK_ENV` | No | Set to `development` for debug mode |
| `PORT` | No | Port number (default: 5000) |

---

## Resume Description

> Developed an AI-powered chatbot using **Retrieval-Augmented Generation (RAG)** with Python and Google Gemini API. Implemented document ingestion pipeline supporting PDF, DOCX, TXT, and CSV formats with multi-file management. Built TF-IDF based semantic search with cosine similarity retrieval. Designed responsive chat interface with file-specific filtering, conversation history, and real-time upload progress. Deployed on Render.com with a public live URL.

---

## Troubleshooting

**PDF shows "scanned PDF" error**
→ Use Google Drive: open PDF → Open with Google Docs → File → Download as .txt → upload that

**"All Gemini models failed" error**
→ Check your API key is correct in `.env`
→ Visit [aistudio.google.com](https://aistudio.google.com) to verify key is active

**Port already in use**
→ Change port: `set PORT=5001` (Windows) or `export PORT=5001` (Mac/Linux) then run again

**pip install fails on Windows**
→ Make sure your virtual environment is activated (`venv\Scripts\activate`)

---

## License

MIT License — free to use, modify, and distribute.

Also make sure your .env.example file looks like this:
GEMINI_API_KEY=paste-your-gemini-key-here
FLASK_ENV=development
PORT=5000
And your render.yaml:
yamlservices:
  - type: web
    name: rag-chatbot
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: FLASK_ENV
        value: production
    autoDeploy: true