# pyre-ignore-all-errors
# pyright: reportMissingImports=false, reportGeneralTypeIssues=false
import glob
import os
import cv2
import numpy as np
import torch.utils.data

_original_imread = cv2.imread
ENABLE_RAM_CACHE = False
USE_NPY_MONOLITH = False

GLOBAL_IMG_CACHE = {}
GLOBAL_MMAP_BUFFERS = {}
GLOBAL_MMAP_DICT = {}

def init_mmaps():
    if not GLOBAL_MMAP_BUFFERS:
        GLOBAL_MMAP_BUFFERS['test_n'] = np.load('test_data.npy', mmap_mode='r')
        GLOBAL_MMAP_BUFFERS['test_g'] = np.load('test_grads.npy', mmap_mode='r')

def _cached_imread(filename, flags=None):
    if USE_NPY_MONOLITH:
        if filename in GLOBAL_MMAP_DICT:
            typ, idx = GLOBAL_MMAP_DICT[filename]
            img = GLOBAL_MMAP_BUFFERS[typ][idx]
            return np.array(img).copy()
            
    if not ENABLE_RAM_CACHE:
        return _original_imread(filename) if flags is None else _original_imread(filename, flags)
    if filename not in GLOBAL_IMG_CACHE:
        img = _original_imread(filename) if flags is None else _original_imread(filename, flags)
        if img is not None and img.shape[:2] != (160, 320):
            img = cv2.resize(img, (320, 160))
        GLOBAL_IMG_CACHE[filename] = img
    return GLOBAL_IMG_CACHE[filename]

cv2.imread = _cached_imread

IMG_EXTENSIONS = [".png", ".jpg", ".jpeg", ".tif"]


class AbnormalDatasetGradientsTest(torch.utils.data.Dataset):
    def __init__(self, args):
        self.args = args
        if args.dataset == "avenue":
            data_path = args.avenue_path
            gt_path = args.avenue_gt_path
        elif args.dataset == "shanghai":
            data_path = args.shanghai_path
            gt_path = args.shanghai_gt_path
        else:
            raise Exception("Unknown dataset!")
        self.ds_name = args.dataset
        self.input_3d = args.input_3d
        self.data, self.labels, self.gradients = self._read_data(data_path, gt_path)
        
        if USE_NPY_MONOLITH:
            init_mmaps()
            for i, p in enumerate(self.data): GLOBAL_MMAP_DICT[p] = ('test_n', i)
            for i, p in enumerate(self.gradients): GLOBAL_MMAP_DICT[p] = ('test_g', i)

    def _read_data(self, data_path, gt_path):
        data = []
        labels = []
        gradients = []

        extension = None
        for ext in IMG_EXTENSIONS:
            test_frame_search = os.path.join(data_path, "test/frames", f"*/*{ext}")
            if len(list(glob.glob(test_frame_search))) > 0:
                extension = ext
                break
        self.extension = extension
        
        dirs = list(glob.glob(os.path.join(data_path, "test", "frames", "*")))
        if len(dirs) == 0:
            # Fallback check for alternate structures
            dirs = list(glob.glob(os.path.join(data_path, "testing", "frames", "*")))
        for dir in dirs:
            imgs_path = list(glob.glob(os.path.join(dir, f"*{extension}")))
            imgs_path = sorted(imgs_path, key=lambda x: int(os.path.basename(x).split('.')[0]))
            lbls = np.loadtxt(os.path.join(gt_path, f"{os.path.basename(dir)}.txt"))

            data += imgs_path
            labels += list(lbls)

            video_name = os.path.basename(dir)
            gradients_path = list(glob.glob(os.path.join(data_path, "test", "gradients2", video_name, "*.png")))
            gradients_path = sorted(gradients_path, key=lambda x: int(os.path.basename(x).split('.')[0]))
            gradients += gradients_path
            
        if len(data) == 0:
            print(f"WARNING: AbnormalDatasetGradientsTest found 0 images at {data_path}!")
            print(f"Check your directory structure: {os.path.join(data_path, 'test/frames')} must exist and contain videos.")

        return data, labels, gradients

    def __getitem__(self, index):
        current_img = cv2.imread(self.data[index])
        dir_path, frame_no, len_frame_no = self.extract_meta_info(self.data, index)
        previous_img = self.read_prev_next_frame_if_exists(dir_path, frame_no, direction=-3, length=len_frame_no)
        next_img = self.read_prev_next_frame_if_exists(dir_path, frame_no, direction=3, length=len_frame_no)
        img = current_img
        if self.input_3d:
            img = np.concatenate([previous_img, current_img, next_img], axis=-1)

        gradient = cv2.imread(self.gradients[index])
        if img.shape[:2] != self.args.input_size[::-1]:
            img = cv2.resize(img, self.args.input_size[::-1])
            current_img = cv2.resize(current_img, self.args.input_size[::-1])
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
        return img, gradient, target, self.labels[index], os.path.basename(os.path.dirname(self.data[index])), self.data[index]


    def extract_meta_info(self, data, index):
        frame_no = int(os.path.splitext(os.path.basename(data[index]))[0])
        dir_path = os.path.dirname(data[index])
        len_frame_no = len(os.path.splitext(os.path.basename(data[index]))[0])
        return dir_path, frame_no, len_frame_no

    def read_prev_next_frame_if_exists(self, dir_path, frame_no, direction=-3, length=1):
        frame_path = os.path.join(dir_path, str(frame_no + direction).zfill(length) + self.extension)
        if os.path.exists(frame_path):
            return cv2.imread(frame_path)
        else:
            return cv2.imread(os.path.join(dir_path, str(frame_no).zfill(length) + self.extension))

    def __len__(self):
        return len(self.data)

    def __repr__(self):
        return self.__class__.__name__
