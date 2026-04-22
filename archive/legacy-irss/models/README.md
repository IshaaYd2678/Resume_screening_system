# Models & Configuration

## Ollama Models

The system uses three main Ollama models:

### Parsing: Mistral 7B
- **Model**: mistral:7b-instruct-q4_K_M
- **Size**: ~4GB (quantized Q4)
- **Use**: Structured JSON extraction from resumes
- **Accuracy**: ~85-90% F1 for skill detection
- **Speed**: ~2-5s per resume on CPU, <1s on GPU

### Explanation: Llama 3.1
- **Model**: llama3.1:8b-instruct-q4_K_M
- **Size**: ~5GB (quantized Q4)
- **Use**: Generating human-readable score explanations
- **Streaming**: Streamed via Server-Sent Events
- **Speed**: ~1-3s for narrative generation

### Embedding: Nomic Embed Text
- **Model**: nomic-embed-text
- **Size**: ~275MB
- **Dimensions**: 384
- **Use**: Semantic similarity scoring
- **Speed**: ~100ms per document
- **Index**: HNSW in pgvector for fast ANN

## Hardware Requirements

### Minimum (CPU-only)
- RAM: 16GB (8GB for Mistral + 8GB for system)
- CPU: 4 cores recommended
- Storage: 50GB free (models + data)
- Time: ~5s per resume

### Recommended (GPU)
- RAM: 8GB system + 8GB VRAM
- GPU: NVIDIA with 8GB+ VRAM (V100, RTX 3080, A100)
- CPU: 4 cores
- Storage: 50GB free
- Time: <2s per resume

### Scaling (Multi-GPU)
- Multiple GPUs: Ollama supports GPU offloading
- Kubernetes: Scale Ollama instances with API loadbalancing
- Celery: Worker processes handle concurrent uploads

## Custom Models

To use custom models:

1. **Create Modelfile**
```dockerfile
FROM mistral:7b-instruct-q4_K_M

PARAMETER temperature 0.3
PARAMETER top_p 0.9

SYSTEM You are a professional resume parser...
```

2. **Build and test locally**
```bash
ollama create my-parser -f Modelfile
ollama run my-parser "Parse this resume: ..."
```

3. **Update settings**
```bash
export MODEL_PARSE=my-parser
```

## Model Quantization

All models use Q4 (4-bit) quantization for smaller size:
- Full model: Mistral 7B = 14GB
- Q4 quantized: 4GB (2x smaller, minimal accuracy loss)

To use full precision (slower but more accurate):
```bash
ollama pull mistral:7b-instruct  # Full precision
export MODEL_PARSE=mistral:7b-instruct
```

## Performance Optimization

### Batch Processing
- Send multiple documents to reduce overhead
- Ollama supports concurrent requests
- Celery chord for parallel scoring

### Caching
- Embeddings cached in pgvector
- Parsed resumes cached in Redis
- HNSW indexes for fast similarity search

### Model Selection
| Scenario | Model | Speed | Accuracy |
|----------|-------|-------|----------|
| Fast parsing (CPU-only) | Phi-3 Mini | ⚡⚡⚡ | ⭐⭐ |
| Balanced (recommended) | Mistral 7B | ⚡⚡ | ⭐⭐⭐ |
| High accuracy (GPU) | Llama 3.1 8B | ⚡ | ⭐⭐⭐⭐ |
| Best accuracy (GPU required) | Llama 3.1 70B | 🐢 | ⭐⭐⭐⭐⭐ |

## Monitoring Models

```bash
# Check loaded models
docker compose exec ollama ollama list

# View model info
docker compose exec ollama ollama show mistral:7b-instruct-q4_K_M

# Monitor inference
# Use Prometheus metrics from /api/metrics

# Profile model performance
# Check Jaeger traces in http://localhost:16686
```

## Updating Models

```bash
# Pull newer version
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M:latest

# Verify hash
docker compose exec ollama ollama show mistral:7b-instruct-q4_K_M

# Remove old versions
docker compose exec ollama ollama rm mistral:7b-instruct-q4_K_M:older
```
