import os
import modal

# 1. Define the Modal Environment Image
# We install standard python dependencies and the system dependencies for OpenCV (libGL)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")  # Required by cv2
    .pip_install(
        "torch",
        "torchvision",
        "timm",
        "ml_collections",
        "einops",
        "opencv-python",
        "scipy",
        "fastapi",
        "python-multipart"
    )
    .add_local_dir(
        local_path=".", 
        remote_path="/root/project",
        ignore=[".gradio", "frontend", "venv", "venv311", "__pycache__", ".git"]
    )
)

# 2. Define the Modal application
app = modal.App(name="aed-mae-backend")

# 3. Expose the FastAPI app
# It requests an NVIDIA T4 GPU for lightning fast processing.
@app.function(
    image=image,
    gpu="T4",
    timeout=600,   # Increase timeout to 10 minutes in case of massive videos
    min_containers=0 # Scale to 0 to incur exactly $0 costs when not actively hitting the backend
)
@modal.asgi_app()
def serve_fastapi():
    # We must explicitly step into the mounted code directory
    os.chdir("/root/project")
    import sys
    sys.path.insert(0, "/root/project")
    
    # Importing APP from live_backend_api will execute load_model() on the powerful GPU container!
    from live_backend_api import APP
    
    # We inject Modal's flexible CORS middleware because your Vercel Next.js URL is dynamic
    from fastapi.middleware.cors import CORSMiddleware
    APP.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return APP
