import torch
# Monkey patch for float8_e8m0fnu compatibility between PyTorch and Transformers
if not hasattr(torch, "float8_e8m0fnu"):
    setattr(torch, "float8_e8m0fnu", torch.float32)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI(title="LLM Visualizer Backend")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and tokenizer
tokenizer = None
model = None
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

@app.on_event("startup")
def load_model():
    global tokenizer, model, device
    print(f"Loading tokenizer for {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    print(f"Loading model {model_name} (preferred device: {device})...")
    try:
        if device == "cuda":
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,
                attn_implementation="eager"
            ).to("cuda")
        else:
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float32,
                attn_implementation="eager"
            ).to("cpu")
    except Exception as e:
        print(f"Failed to load on CUDA: {e}. Falling back to CPU.")
        device = "cpu"
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float32,
            attn_implementation="eager"
        ).to("cpu")
    print(f"Model successfully loaded on {device}.")

class AnalysisRequest(BaseModel):
    text: str

class TokenAlternative(BaseModel):
    token: str
    probability: float

class PositionAnalysis(BaseModel):
    position: int
    token: str
    token_id: int
    alternatives: list[TokenAlternative]

class AnalysisResponse(BaseModel):
    tokens: list[PositionAnalysis]
    attentions: list[list[list[float]]]  # Shape: [layers, seq_len, seq_len]
    completion: str

@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze_text(request: AnalysisRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text prompt cannot be empty.")
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model is still loading or failed to load.")
    
    # Tokenize input
    inputs = tokenizer(request.text, return_tensors="pt")
    input_ids = inputs["input_ids"][0]  # shape: (seq_len,)
    seq_len = len(input_ids)
    
    # Move inputs to target device
    device_inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Forward pass
    with torch.no_grad():
        outputs = model(**device_inputs, output_attentions=True)
    
    # 1. Process attentions
    # outputs.attentions is a tuple of length num_layers
    # Each tensor is shape (batch_size, num_heads, seq_len, seq_len)
    mean_attentions = []
    for layer_attn in outputs.attentions:
        # Mean across head dimension (dim=1) and squeeze batch (dim=0)
        mean_attn = torch.mean(layer_attn, dim=1).squeeze(0)  # shape: (seq_len, seq_len)
        mean_attentions.append(mean_attn.cpu().tolist())
    
    # 2. Extract top-5 alternatives and percentage probabilities
    # Logits shape: (batch_size, seq_len, vocab_size)
    logits = outputs.logits[0]  # shape: (seq_len, vocab_size)
    probs = torch.softmax(logits, dim=-1)  # shape: (seq_len, vocab_size)
    
    # Decode token strings
    token_strings = [tokenizer.decode([tid]) for tid in input_ids]
    
    tokens_analysis = []
    for i in range(seq_len):
        token_id = int(input_ids[i])
        token_str = token_strings[i]
        
        # Predictions for position i (based on logits at i-1)
        # Note: Position 0 has no prior context, so alternatives are empty
        alternatives = []
        if i > 0:
            # We look at predictions from the previous token
            position_probs = probs[i - 1]
            top_probs, top_indices = torch.topk(position_probs, k=5)
            
            top_probs = top_probs.cpu().tolist()
            top_indices = top_indices.cpu().tolist()
            
            for p, idx in zip(top_probs, top_indices):
                alternatives.append(TokenAlternative(
                    token=tokenizer.decode([idx]),
                    probability=round(p * 100.0, 2)
                ))
        
        tokens_analysis.append(PositionAnalysis(
            position=i,
            token=token_str,
            token_id=token_id,
            alternatives=alternatives
        ))
    
    # 3. Generate a clean 50-token completion
    with torch.no_grad():
        generate_ids = model.generate(
            device_inputs["input_ids"],
            max_new_tokens=50,
            do_sample=True,
            top_k=50,
            top_p=0.95,
            temperature=0.7,
        )
    # We only want the newly generated tokens
    completion_ids = generate_ids[0][seq_len:]
    completion_text = tokenizer.decode(completion_ids, skip_special_tokens=True)
    
    return AnalysisResponse(
        tokens=tokens_analysis,
        attentions=mean_attentions,
        completion=completion_text
    )
