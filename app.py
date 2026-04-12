# pyre-ignore-all-errors
# pyright: reportMissingImports=false, reportGeneralTypeIssues=false
import os
import glob
import cv2
import numpy as np
import torch
import gradio as gr
import matplotlib.pyplot as plt
from tqdm import tqdm
from PIL import Image

from configs.configs import get_configs_avenue # type: ignore
from model.model_factory import mae_cvt_patch16 # type: ignore
from util.abnormal_utils import filt # type: ignore

class SingleVideoDataset(torch.utils.data.Dataset):
    def __init__(self, video_path, temp_dir, args):
        self.args = args
        self.temp_dir = temp_dir
        self.input_3d = args.input_3d
        self.extension = ".png"
        self.video_name = "test_vid"
        
        # 1. Extract Frames
        self.frames_dir = os.path.join(temp_dir, "frames", self.video_name)
        os.makedirs(self.frames_dir, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret: break
            cv2.imwrite(os.path.join(self.frames_dir, f"{frame_idx:04d}.png"), frame)
            frame_idx += 1
        cap.release()
        
        # 2. Extract Gradients
        self.grads_dir = os.path.join(temp_dir, "gradients", self.video_name)
        os.makedirs(self.grads_dir, exist_ok=True)
        img_paths = sorted(glob.glob(os.path.join(self.frames_dir, "*.png")))
        step = 1
        for i, img_path in enumerate(img_paths):
            prev_idx = max(0, i - step)
            next_idx = min(len(img_paths) - 1, i + step)
            prev_img = cv2.imread(img_paths[prev_idx]).astype(np.int32)
            next_img = cv2.imread(img_paths[next_idx]).astype(np.int32)
            gradient = np.abs(prev_img - next_img).astype(np.uint8)
            gradient = cv2.cvtColor(gradient, cv2.COLOR_BGR2RGB)
            cv2.imwrite(os.path.join(self.grads_dir, os.path.basename(img_path)), gradient)

        self.data = sorted(glob.glob(os.path.join(self.frames_dir, "*.png")))
        self.gradients = sorted(glob.glob(os.path.join(self.grads_dir, "*.png")))

    def __len__(self):
        return len(self.data)

    def read_frame(self, frame_no, direction=0):
        target_idx = max(0, min(len(self.data)-1, frame_no + direction))
        return cv2.imread(self.data[target_idx])

    def __getitem__(self, index):
        current_img = cv2.imread(self.data[index])
        
        previous_img = self.read_frame(index, direction=-3)
        next_img = self.read_frame(index, direction=3)
        
        if current_img is not None and current_img.shape[:2] != self.args.input_size[::-1]:
            current_img = cv2.resize(current_img, self.args.input_size[::-1])
            previous_img = cv2.resize(previous_img, self.args.input_size[::-1])
            next_img = cv2.resize(next_img, self.args.input_size[::-1])
        
        img = current_img
        if self.input_3d:
            img = np.concatenate([previous_img, current_img, next_img], axis=-1)

        gradient = cv2.imread(self.gradients[index])
        if gradient is not None and gradient.shape[:2] != self.args.input_size[::-1]:
            gradient = cv2.resize(gradient, self.args.input_size[::-1])
            
        mask = np.zeros((img.shape[0], img.shape[1], 1), dtype=np.uint8)
        target = np.concatenate((current_img, mask), axis=-1)
        
        img = img.astype(np.float32)
        gradient = gradient.astype(np.float32)
        target = target.astype(np.float32)
        img = (img - 127.5) / 127.5
        target = (target - 127.5) / 127.5
        img = np.swapaxes(img, 0, -1).swapaxes(1, -1)
        target = np.swapaxes(target, 0, -1).swapaxes(1, -1)
        gradient = np.swapaxes(gradient, 0, 1).swapaxes(0, -1)
        
        return img, gradient, target

def load_model():
    print("Loading AED-MAE Model...")
    args = get_configs_avenue()
    args.device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    model = mae_cvt_patch16(norm_pix_loss=args.norm_pix_loss, img_size=args.input_size,
                            use_only_masked_tokens_ab=args.use_only_masked_tokens_ab,
                            abnormal_score_func=args.abnormal_score_func,
                            masking_method=args.masking_method,
                            grad_weighted_loss=args.grad_weighted_rec_loss).float()
    
    # Cloud-Ready Path Logic: Check root first, then the experiments folder
    if os.path.exists("checkpoint-best-student.pth"):
        student_path = "checkpoint-best-student.pth"
        teacher_path = "checkpoint-best.pth"
    elif os.path.exists("experiments/avenue/checkpoint-best-student.pth"):
        student_path = "experiments/avenue/checkpoint-best-student.pth"
        teacher_path = "experiments/avenue/checkpoint-best.pth"
    else:
        raise FileNotFoundError("Could not find checkpoint-best-student.pth. Ensure it is uploaded to the root of your Space!")

    print(f"Loading weights from: {student_path}")
    student = torch.load(student_path, map_location=args.device, weights_only=False)['model']
    teacher = torch.load(teacher_path, map_location=args.device, weights_only=False)['model']
    
    for key in student:
        if 'student' in key:
            teacher[key] = student[key]
            
    model.load_state_dict(teacher, strict=False)
    model.to(args.device)
    model.eval()
    
    return model, args

# Initialize Global Model
if not hasattr(plt, "is_initialized"):
    try:
        global_model, global_args = load_model()
        plt.is_initialized = True
    except Exception as e:
        print(f"Failed to load model on startup: {e}")

def process_video(video_path):
    if video_path is None: return None, "Please upload a video."
    
    print(f"Processing Video: {video_path}")
    temp_dir = os.path.join(os.getcwd(), "tmp_inference")
    os.makedirs(temp_dir, exist_ok=True)
    
    dataset = SingleVideoDataset(video_path, temp_dir, global_args)
    data_loader = torch.utils.data.DataLoader(dataset, batch_size=4, num_workers=0, drop_last=False)
    
    predictions_teacher = []
    predictions_student_teacher = []
    
    with torch.no_grad():
        for samples, grads, targets in tqdm(data_loader, desc="Running Inference"):
            samples = samples.to(global_args.device)
            grads = grads.to(global_args.device)
            targets = targets.to(global_args.device)
            
            global_model.train_TS = True
            global_model.abnormal_score_func_TS = "L2"
            
            _, _, _, recon_st_tc = global_model(samples, targets=targets, grad_mask=grads, mask_ratio=global_args.mask_ratio)
            
            predictions_student_teacher += list(recon_st_tc[0].detach().cpu().numpy())
            predictions_teacher += list(recon_st_tc[1].detach().cpu().numpy())
            
    # Combine predictions
    pred_teacher = np.array(predictions_teacher)
    pred_st = np.array(predictions_student_teacher)
    predictions = pred_teacher + pred_st
    
    # Filter and Smooth
    predictions = filt(predictions, range=38, mu=11)
    
    # Normalize for display
    predictions = (predictions - np.min(predictions)) / (np.max(predictions) - np.min(predictions) + 1e-6)
    
    # Plotting: Premium Dark/Neon Aesthetics
    with plt.style.context('dark_background'):
        plt.figure(figsize=(10, 4))
        # Sleek neon red line with heavy line weight
        plt.plot(predictions, color='#ff3366', linewidth=2.5, label="Anomaly Detection Signal")
        
        # Subtle glowing gradient fill
        plt.fill_between(range(len(predictions)), predictions, color='#ff3366', alpha=0.15)
        
        # Better typography and structure
        plt.title("AnomalyVision Temporal Anomaly Analysis", fontsize=14, fontweight='bold', pad=15)
        plt.xlabel("Video Frame Progression", fontsize=10, labelpad=10)
        plt.ylabel("Risk Multiplier", fontsize=10, labelpad=10)
        
        # High-tech grid
        plt.grid(True, linestyle='--', color='#333333', alpha=0.8)
        
        # Background contrast tweaking
        ax = plt.gca()
        ax.set_facecolor('#0f0f11')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#333333')
        ax.spines['bottom'].set_color('#333333')
        
        plt.legend(loc="upper left", frameon=False)
        plt.tight_layout()
        
        plot_path = os.path.join(temp_dir, "anomaly_plot.png")
        plt.savefig(plot_path, bbox_inches='tight', dpi=200) # Increased DPI for crispness
        plt.close()
        
    return plot_path, f"✅ Successfully analyzed {len(predictions)} frames."

# Gradio Interface: Premium Soft Theme setup
custom_theme = gr.themes.Soft(
    primary_hue="rose",
    neutral_hue="slate",
    font=[gr.themes.GoogleFont("Inter"), "ui-sans-serif", "system-ui", "sans-serif"]
).set(
    body_background_fill="*neutral_50",
    block_background_fill="*neutral_100",
    block_border_width="0px"
)

with gr.Blocks(theme=custom_theme, title="AnomalyVision") as demo:
    gr.HTML(
        """
        <div style="text-align: center; max-width: 800px; margin: 0 auto; padding: 25px;">
            <h1 style="font-weight: 800; font-size: 2.5rem; margin-bottom: 0.5rem; color: #e11d48; display: flex; align-items: center; justify-content: center; gap: 10px;">
                🚨 AnomalyVision Framework
            </h1>
            <p style="font-size: 1.1rem; color: #4b5563; font-weight: 400; line-height: 1.5;">
                AI-Based Video Anomaly Detection using Masked Auto Encoders.<br/>
                Upload surveillance footage to dynamically identify abnormal events using PyTorch Vision Transformers.
            </p>
        </div>
        """
    )
    
    with gr.Row(equal_height=True):
        with gr.Column(scale=4):
            gr.Markdown("### 📥 1. Surveillance Input")
            video_input = gr.Video(label="Upload Video (.avi / .mp4)", elem_classes="rounded-xl shadow-md")
            analyze_button = gr.Button("🔍 Detect Anomalies", variant="primary", size="lg")
        
        with gr.Column(scale=6):
            gr.Markdown("### 📊 2. Algorithmic Analysis")
            plot_output = gr.Image(label="Temporal Anomaly Score", type="filepath", elem_classes="rounded-xl shadow-md")
            status_text = gr.Textbox(label="Status Logging", placeholder="System Idle. Waiting for video upload...", lines=1)
            
    analyze_button.click(fn=process_video, inputs=[video_input], outputs=[plot_output, status_text])

if __name__ == "__main__":
    print("Launching Web Deployment UI...")
    demo.launch(server_name="0.0.0.0", server_port=7860, share=True)
