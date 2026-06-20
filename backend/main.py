
import torch

if not hasattr(torch, "float8_e8m0fnu"):
    setattr(torch, "float8_e8m0fnu", torch.float32)

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transformers import AutoTokenizer, AutoModelForCausalLM

@asynccontextmanager
async def lifespan(app: FastAPI):

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
    yield  

app = FastAPI(title="LLM Visualizer Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tokenizer = None
model = None
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

SYSTEM_PROMPT = (
    "You are explaining machine learning concepts to a curious beginner who has never "
    "studied AI. Be conversational, warm, and specific to the data you are given. "
    "Keep each explanation under 3 sentences. Never use jargon without immediately "
    "explaining it in plain words."
)

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
    attentions: list[list[list[float]]]  
    completion: str

class ExplainRequest(BaseModel):
    tokens: list[dict]                       
    first_layer_attention: list[list[float]] 
    last_layer_attention: list[list[float]]  

class ExplainResponse(BaseModel):
    tokens: str
    attention: str
    predictions: str

def _generate_explanation(user_prompt: str, max_new_tokens: int = 110) -> str:

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]
    try:
        chat_text = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
    except Exception:

        chat_text = (
            f"<s>[INST] <<SYS>>\n{SYSTEM_PROMPT}\n<</SYS>>\n\n{user_prompt} [/INST]"
        )

    inputs = tokenizer(chat_text, return_tensors="pt").to(device)
    input_len = inputs["input_ids"].shape[1]

    with torch.no_grad():
        output_ids = model.generate(
            inputs["input_ids"],
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.75,
            top_p=0.9,
            repetition_penalty=1.15,
            pad_token_id=tokenizer.eos_token_id,
        )

    new_tokens = output_ids[0][input_len:]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    for stop_marker in ["</s>", "[/INST]", "<|", "User:", "user:"]:
        if stop_marker in text:
            text = text[: text.index(stop_marker)].strip()

    return text or "No explanation generated."

def _top_attention_pair(layer_matrix: list[list[float]], token_list: list[dict]):

    max_val, max_r, max_c = 0.0, 0, 0
    for r, row in enumerate(layer_matrix):
        for c, val in enumerate(row):
            if r != c and val > max_val:
                max_val, max_r, max_c = val, r, c
    from_tok = token_list[max_r].get("token", "<s>") if max_r < len(token_list) else "?"
    to_tok   = token_list[max_c].get("token", "<s>") if max_c < len(token_list) else "?"
    return from_tok, to_tok, round(max_val, 3)

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "model": model_name,
        "device": device,
        "model_loaded": model is not None,
        "endpoints": ["/api/analyze", "/api/explain"],
    }

@app.post("/api/explain", response_model=ExplainResponse)
def explain_analysis(request: ExplainRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model is still loading or failed to load.")

    tokens = request.tokens
    seq_len = len(tokens)

    token_strs = [t.get("token", "") for t in tokens[:20]]
    token_list_str = " · ".join(f'"{s}"' for s in token_strs)
    tokens_prompt = (
        f"The AI model split the input into {seq_len} tokens: {token_list_str}. "
        f"Explain what tokenization is and why the text might have been split this way."
    )

    fr0, to0, val0 = _top_attention_pair(request.first_layer_attention, tokens)
    frL, toL, valL = _top_attention_pair(request.last_layer_attention, tokens)
    attention_prompt = (
        f'In the model\'s earliest layer, the word "{fr0}" paid the most attention to "{to0}" '
        f'(strength: {val0}). '
        f'In the final deep layer, "{frL}" focused most strongly on "{toL}" (strength: {valL}). '
        f"Explain what attention means and what this shift between early and late layers tells us."
    )

    best_pos, best_token, best_alts = None, None, []
    for t in tokens:
        alts = t.get("alternatives", [])
        if len(alts) >= 2:
            best_token = t.get("token", "")
            best_alts  = alts[:3]
            break

    if best_token and best_alts:
        alt_str = ", ".join(f'"{a.get("token","")}" ({a.get("probability",0):.1f}%)' for a in best_alts)
        predictions_prompt = (
            f'At one position, the AI chose "{best_token}" but also strongly considered: {alt_str}. '
            f"Explain what these probability scores reveal about how the model decides which word comes next."
        )
    else:
        predictions_prompt = (
            f"The AI model scores all {32000} possible next tokens and picks the most likely one. "
            f"Explain in plain words how a language model decides what to say next."
        )

    tokens_exp     = _generate_explanation(tokens_prompt)
    attention_exp  = _generate_explanation(attention_prompt)
    predictions_exp = _generate_explanation(predictions_prompt)

    return ExplainResponse(
        tokens=tokens_exp,
        attention=attention_exp,
        predictions=predictions_exp,
    )

@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze_text(request: AnalysisRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text prompt cannot be empty.")

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model is still loading or failed to load.")

    inputs = tokenizer(request.text, return_tensors="pt")
    input_ids = inputs["input_ids"][0]  
    seq_len = len(input_ids)

    device_inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**device_inputs, output_attentions=True)

    mean_attentions = []
    for layer_attn in outputs.attentions:

        mean_attn = torch.mean(layer_attn, dim=1).squeeze(0)  
        mean_attentions.append(mean_attn.cpu().tolist())

    logits = outputs.logits[0]  
    probs = torch.softmax(logits, dim=-1)  

    token_strings = [tokenizer.decode([tid]) for tid in input_ids]

    tokens_analysis = []
    for i in range(seq_len):
        token_id = int(input_ids[i])
        token_str = token_strings[i]

        alternatives = []
        if i > 0:

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
    try:
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant. Give short, direct answers under 3 sentences."},
            {"role": "user", "content": request.text}
        ]
        chat_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    except Exception:
        chat_text = f"<s>[INST] {request.text} [/INST]"

    chat_inputs = tokenizer(chat_text, return_tensors="pt").to(device)
    chat_len = chat_inputs["input_ids"].shape[1]

    with torch.no_grad():
        generate_ids = model.generate(
            chat_inputs["input_ids"],
            max_new_tokens=50,
            do_sample=True,
            top_k=50,
            top_p=0.95,
            temperature=0.7,
            pad_token_id=tokenizer.eos_token_id,
        )
    completion_ids = generate_ids[0][chat_len:]
    completion_text = tokenizer.decode(completion_ids, skip_special_tokens=True).strip()

    return AnalysisResponse(
        tokens=tokens_analysis,
        attentions=mean_attentions,
        completion=completion_text
    )
