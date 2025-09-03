# Copyright (C) 2023, Inria
# GRAPHDECO research group, https://team.inria.fr/graphdeco
# All rights reserved.
#
# This software is free for non-commercial, research and evaluation use
# under the terms of the LICENSE.md file.
#
# For inquiries contact  george.drettakis@inria.fr
#

import os
import logging
from argparse import ArgumentParser
import shutil

# This Python script is based on the shell converter script provided in the MipNerF 360 repository.
parser = ArgumentParser("Colmap converter (exhaustive only)")
parser.add_argument("--no_gpu", action='store_true')
parser.add_argument("--skip_matching", action='store_true')
parser.add_argument("--source_path", "-s", required=True, type=str)
parser.add_argument("--camera", default="OPENCV", type=str)
parser.add_argument("--colmap_executable", default="", type=str)
parser.add_argument("--resize", action="store_true")
parser.add_argument("--magick_executable", default="", type=str)
args = parser.parse_args()

colmap_command = '"{}"'.format(args.colmap_executable) if len(args.colmap_executable) > 0 else "colmap"
magick_command = '"{}"'.format(args.magick_executable) if len(args.magick_executable) > 0 else "magick"
use_gpu = 1 if not args.no_gpu else 0

def find_best_reconstruction(sparse_path):
    best_model = None
    max_images = 0
    for folder in os.listdir(sparse_path):
        model_path = os.path.join(sparse_path, folder)
        if os.path.isdir(model_path) and "images.bin" in os.listdir(model_path):
            num_images = read_binary_num_images(model_path)
            if num_images > max_images:
                best_model = model_path
                max_images = num_images
    return best_model

def read_binary_num_images(path):
    try:
        with open(os.path.join(path, "images.bin"), "rb") as f:
            # Stima grezza del numero di immagini scorrendo il file
            f.read(8)  # header
            num_images = 0
            chunk = f.read(64)
            while chunk and len(chunk) >= 64:
                num_images += 1
                chunk = f.read(64)
            return num_images
    except Exception:
        return 0

if not args.skip_matching:

    # Pulisce eventuali risultati precedenti
    folders_to_remove = [
        os.path.join(args.source_path, "distorted"),
        os.path.join(args.source_path, "images"),
        os.path.join(args.source_path, "sparse"),
        os.path.join(args.source_path, "output"),
        os.path.join(args.source_path, "stereo"),
    ]
    for folder in folders_to_remove:
        if os.path.exists(folder):
            shutil.rmtree(folder)

    os.makedirs(os.path.join(args.source_path, "distorted", "sparse"), exist_ok=True)

    # Feature extraction
    feat_extracton_cmd = (
        f'{colmap_command} feature_extractor '
        f'--database_path {args.source_path}/distorted/database.db '
        f'--image_path {args.source_path}/input '
        f'--ImageReader.single_camera 1 '
        f'--ImageReader.camera_model {args.camera} '
        f'--SiftExtraction.use_gpu {use_gpu}'
    )
    exit_code = os.system(feat_extracton_cmd)
    if exit_code != 0:
        logging.error(f"Feature extraction failed with code {exit_code}. Exiting.")
        raise SystemExit(exit_code)

    # 🔒 Matching: sempre e solo EXHAUSTIVE
    feat_matching_cmd = (
        f'{colmap_command} exhaustive_matcher '
        f'--database_path {args.source_path}/distorted/database.db '
        f'--SiftMatching.use_gpu {use_gpu}'
    )
    exit_code = os.system(feat_matching_cmd)
    if exit_code != 0:
        logging.error(f"Feature matching failed with code {exit_code}. Exiting.")
        raise SystemExit(exit_code)

    # Mapper / bundle adjustment
    mapper_cmd = (
        f'{colmap_command} mapper '
        f'--database_path {args.source_path}/distorted/database.db '
        f'--image_path {args.source_path}/input '
        f'--output_path {args.source_path}/distorted/sparse '
        f'--Mapper.ba_global_function_tolerance=0.000001'
    )
    print("🗺️  Starting bundle adjustment...")
    exit_code = os.system(mapper_cmd)
    if exit_code != 0:
        logging.error(f"Mapper failed with code {exit_code}. Exiting.")
        raise SystemExit(exit_code)

# Seleziona il miglior modello ricostruito
sparse_base = os.path.join(args.source_path, "distorted", "sparse")
best_model_path = find_best_reconstruction(sparse_base)
if best_model_path is None:
    logging.error("❌ Nessuna ricostruzione valida trovata.")
    raise SystemExit(1)

# Undistort
print("📐 Undistorting images...")
img_undist_cmd = (
    f'{colmap_command} image_undistorter '
    f'--image_path {args.source_path}/input '
    f'--input_path {best_model_path} '
    f'--output_path {args.source_path} '
    f'--output_type COLMAP'
)
exit_code = os.system(img_undist_cmd)
if exit_code != 0:
    logging.error(f"Image undistorter failed with code {exit_code}. Exiting.")
    raise SystemExit(exit_code)

# Colmap si aspetta i files in sparse/0
files = os.listdir(os.path.join(args.source_path, "sparse"))
os.makedirs(os.path.join(args.source_path, "sparse", "0"), exist_ok=True)
for file in files:
    if file == '0':
        continue
    source_file = os.path.join(args.source_path, "sparse", file)
    destination_file = os.path.join(args.source_path, "sparse", "0", file)
    shutil.move(source_file, destination_file)

# Resize opzionale
if args.resize:
    print("Copying and resizing...")

    os.makedirs(os.path.join(args.source_path, "images_2"), exist_ok=True)
    os.makedirs(os.path.join(args.source_path, "images_4"), exist_ok=True)
    os.makedirs(os.path.join(args.source_path, "images_8"), exist_ok=True)

    files = os.listdir(os.path.join(args.source_path, "images"))
    for file in files:
        source_file = os.path.join(args.source_path, "images", file)

        destination_file = os.path.join(args.source_path, "images_2", file)
        shutil.copy2(source_file, destination_file)
        exit_code = os.system(f'{magick_command} mogrify -resize 50% "{destination_file}"')
        if exit_code != 0:
            logging.error(f"50% resize failed with code {exit_code}. Exiting.")
            raise SystemExit(exit_code)

        destination_file = os.path.join(args.source_path, "images_4", file)
        shutil.copy2(source_file, destination_file)
        exit_code = os.system(f'{magick_command} mogrify -resize 25% "{destination_file}"')
        if exit_code != 0:
            logging.error(f"25% resize failed with code {exit_code}. Exiting.")
            raise SystemExit(exit_code)

        destination_file = os.path.join(args.source_path, "images_8", file)
        shutil.copy2(source_file, destination_file)
        exit_code = os.system(f'{magick_command} mogrify -resize 12.5% "{destination_file}"')
        if exit_code != 0:
            logging.error(f"12.5% resize failed with code {exit_code}. Exiting.")
            raise SystemExit(exit_code)
