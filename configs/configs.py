# pyre-ignore-all-errors
# pyright: reportMissingImports=false, reportGeneralTypeIssues=false
import os
import ml_collections  # type: ignore


def _getenv_any(*keys: str) -> str | None:
    for k in keys:
        v = os.getenv(k)
        if v:
            return v
    return None


def get_configs_avenue():
    config = ml_collections.ConfigDict()
    config.batch_size = 256
    config.epochs = 50
    config.mask_ratio = 0.5
    config.start_TS_epoch = 5
    config.masking_method = "random_masking"
    config.output_dir = _getenv_any("VAD_OUTPUT_DIR", "OUTPUT_DIR") or "experiments/avenue"  # the checkpoints will be loaded from here
    config.abnormal_score_func = ['L2', 'L2']
    config.grad_weighted_rec_loss = True
    config.model = "mae_cvt"
    config.input_size = (160, 320)
    config.norm_pix_loss = False
    config.use_only_masked_tokens_ab = False
    config.run_type = 'train'
    config.resume = False
    # Optimizer parameters
    config.weight_decay = 0.05
    config.lr = 1e-4
    config.warmup_epochs = 2
    config.min_lr = 1e-6
    config.clip_grad = 0.05

    # Dataset parameters
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config.dataset = "avenue"
    config.avenue_path = _getenv_any("VAD_AVENUE_PATH", "VAD_DATA_PATH") or os.path.join(project_root, "Avenue_Extracted", "Avenue Dataset")
    config.avenue_gt_path = _getenv_any("VAD_AVENUE_GT_PATH", "VAD_GT_PATH") or os.path.join(project_root, "data", "avenue", "gt_txt_labels")
    config.percent_abnormal = 0.0
    config.input_3d = True
    config.device = _getenv_any("VAD_DEVICE", "DEVICE") or "cuda"

    config.start_epoch = 0
    config.print_freq = 10
    config.num_workers = 20
    config.pin_mem = True

    return config


def get_configs_shanghai():
    config = ml_collections.ConfigDict()
    config.batch_size = 100
    config.epochs = 50
    config.mask_ratio = 0.5
    config.start_TS_epoch = 100
    config.masking_method = "random_masking"
    config.output_dir = _getenv_any("VAD_OUTPUT_DIR", "OUTPUT_DIR") or "experiments/shanghai" # the checkpoints will be loaded from here
    config.abnormal_score_func = 'L1'
    config.grad_weighted_rec_loss = True
    config.model = "mae_cvt"
    config.input_size = (160, 320)
    config.norm_pix_loss = False
    config.use_only_masked_tokens_ab = False
    config.run_type = "train"
    config.resume=False

    # Optimizer parameters
    config.weight_decay = 0.05
    config.lr = 1e-4

    # Dataset parameters
    config.dataset = "shanghai"
    config.shanghai_path = _getenv_any("VAD_SHANGHAI_PATH", "VAD_DATA_PATH") or "/media/alin/hdd/SanhaiTech"
    config.shanghai_gt_path = _getenv_any("VAD_SHANGHAI_GT_PATH", "VAD_GT_PATH") or "/media/alin/hdd/Transformer_Labels/Shanghai_gt"
    config.percent_abnormal = 0.25
    config.input_3d = True
    config.device = _getenv_any("VAD_DEVICE", "DEVICE") or "cuda"

    config.start_epoch = 0
    config.print_freq = 10
    config.num_workers = 10
    config.pin_mem = False

    return config
