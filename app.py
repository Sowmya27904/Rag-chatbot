import os
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from rag_engine import (
    extract_text,
    store_document,
    retrieve_context,
    generate_answer,
    get_store_stats,
    delete_document,
    clear_store,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    file_bytes = file.read()

    if len(file_bytes) == 0:
        return jsonify({"error": "File is empty"}), 400

    try:
        text = extract_text(file_bytes, filename)
        num_chunks = store_document(filename, text)

        return jsonify({
            "success": True,
            "filename": filename,
            "chunks": num_chunks,
            "characters": len(text),
            "message": f"Processed into {num_chunks} searchable chunks.",
        })

    except RuntimeError as e:
        err = str(e)

        # Scanned PDF — special helpful message
        if "SCANNED_PDF" in err:
            return jsonify({
                "error": "scanned_pdf",
                "message": (
                    "This PDF is image/scanned-based and cannot be read automatically. "
                    "Please try one of these:\n"
                    "1. Use Adobe Acrobat to export as Word (.docx) then upload that\n"
                    "2. Copy-paste the text into a .txt file and upload that\n"
                    "3. Use Google Drive: open PDF → right click → Open with Google Docs → "
                    "File → Download as .txt"
                )
            }), 422

        return jsonify({"error": err}), 422

    except Exception as e:
        logger.exception("Upload failed for %s", filename)
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    # Optional: frontend can send which file to query
    filename_filter = data.get("filename_filter") or None

    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    try:
        stats = get_store_stats()
        logger.info("Chat request — question: '%s', filter: %s, store: %s",
                    message[:60], filename_filter, stats)

        chunks = retrieve_context(message, top_k=6, filename_filter=filename_filter)
        answer = generate_answer(message, chunks, history, filename_filter)
        sources = list({c["filename"] for c in chunks})

        return jsonify({
            "answer": answer,
            "sources": sources,
            "chunks_used": len(chunks),
        })

    except Exception as e:
        logger.exception("Chat error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents", methods=["GET"])
def documents():
    return jsonify(get_store_stats())


# Delete ONE specific document
@app.route("/api/documents/<path:filename>", methods=["DELETE"])
def delete_one_document(filename):
    try:
        delete_document(filename)
        return jsonify({"success": True, "message": f"'{filename}' deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Delete ALL documents
@app.route("/api/documents", methods=["DELETE"])
def delete_all_documents():
    clear_store()
    return jsonify({"success": True, "message": "All documents cleared."})


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)