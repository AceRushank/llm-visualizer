# Neural Observatory — LLM Inference Visualizer

Neural Observatory is an interactive, premium web application designed to visualize the internal mechanics of a causal Language Model (TinyLlama-1.1B) during text generation. It visualizes tokenization, multi-head attention weights across layers, next-token probability distributions, and provides real-time explanations.

## Features

- **Token Sequence Stream:** Highlights tokenizer boundary splits and displays token details.
- **Interactive Attention Matrix:** Centered, scrollable multi-head attention heatmap displaying the focus shifts across early, middle, and late layers.
- **Probability Distribution Analytics:** Visualizes Softmax top-5 prediction alternatives with dynamic bar tracking.
- **Model Explainer Panel:** Provides plain-English explanations of tokenization, attention patterns, and prediction criteria generated dynamically by the model.
- **Typewriter Output Strip:** Displays model response completion using a typewriter sequence animation.

---

## Repository Structure

```
├── backend/
│   ├── main.py              # FastAPI server (Tokenization, Inference, and Explanations)
│   ├── requirements.txt     # Python dependencies
│   └── .venv/               # Virtual environment
└── frontend/
    ├── src/                 # React & Vite source code
    ├── package.json         # Frontend configuration
    └── index.html           # Application root entry
```

---

## Setup & Running

### 1. Backend Setup (FastAPI)

Prerequisites: Python 3.10+

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

The backend API will be available at `http://localhost:8000`. On startup, it automatically loads `TinyLlama/TinyLlama-1.1B-Chat-v1.0` (using CUDA if available, falling back to CPU).

### 2. Frontend Setup (React + Vite)

Prerequisites: Node.js 18+

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

The visualizer interface will be accessible at `http://localhost:5173`.
