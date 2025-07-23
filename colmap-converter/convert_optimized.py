#
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
import sqlite3
import numpy as np

# This Python script is based on the shell converter script provided in the MipNerF 360 repository.
parser = ArgumentParser("Colmap converter")
parser.add_argument("--no_gpu", action='store_true')
parser.add_argument("--skip_matching", action='store_true')
parser.add_argument("--source_path", "-s", required=True, type=str)
parser.add_argument("--camera", default="OPENCV", type=str)
parser.add_argument("--colmap_executable", default="", type=str)
parser.add_argument("--resize", action="store_true")
parser.add_argument("--magick_executable", default="", type=str)
# 🆕 NUOVI PARAMETRI PER OTTIMIZZAZIONE
parser.add_argument("--max_features", default=8000, type=int, help="Maximum number of features per image")
parser.add_argument("--matching_strategy", default="auto", choices=["auto","exhaustive", "sequential", "vocab_tree"], 
                    help="Feature matching strategy")
parser.add_argument("--overlap", default=10, type=int, help="Number of overlapping images for sequential matching")
args = parser.parse_args()
colmap_command = '"{}"'.format(args.colmap_executable) if len(args.colmap_executable) > 0 else "colmap"
magick_command = '"{}"'.format(args.magick_executable) if len(args.magick_executable) > 0 else "magick"
use_gpu = 1 if not args.no_gpu else 0

def analyze_features_for_strategy(database_path):
    """
    Analizza le feature estratte per determinare automaticamente
    la strategia di matching ottimale
    """
    
    try:
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()
        
        # Conta immagini totali
        cursor.execute("SELECT COUNT(*) FROM images")
        num_images = cursor.fetchone()[0]
        
        # Analizza keypoints usando la struttura documentata COLMAP
        # La tabella keypoints ha: image_id, rows, cols, data
        cursor.execute("SELECT image_id, rows FROM keypoints WHERE data IS NOT NULL AND rows > 0")
        keypoint_data = cursor.fetchall()
        
        if not keypoint_data:
            print("❌ No keypoint data found")
            conn.close()
            return "vocab_tree", {
                "num_images": 50,
                "max_features": 6000,
                "max_matches": 16384
            }
        
        # Calcola statistiche delle feature (rows = numero di keypoints)
        feature_counts = [int(row[1]) for row in keypoint_data if row[1] > 0]
        
        if not feature_counts:
            print("❌ No valid feature counts")
            conn.close()
            return "vocab_tree", {}
        
        avg_features = np.mean(feature_counts)
        std_features = np.std(feature_counts)
        feature_consistency = std_features / avg_features if avg_features > 0 else 1
        
        conn.close()
        
        print(f"📊 Scene Analysis:")
        print(f"   Images: {num_images}")
        print(f"   Avg features/image: {avg_features:.0f}")
        print(f"   Feature consistency: {feature_consistency:.2f}")
        
        # LOGICA DI DECISIONE
        
        # Scene molto semplici: poche feature, molto consistenti
        if avg_features < 4000 and feature_consistency < 0.4:
            print(f"🎯 Simple scene detected → EXHAUSTIVE")
            return "exhaustive", {}
        
        # Scene molto complesse: molte feature
        elif avg_features > 6000:
            print(f"🎯 Complex scene detected → VOCAB_TREE (high performance)")
            return "vocab_tree", {
                "num_images": 100,
                "max_features": 8000,
                "max_matches": 32768
            }
        
        # Scene medie: decisione basata sul numero di immagini
        else:
            if num_images <= 150:
                print(f"🎯 Medium scene, few images → EXHAUSTIVE")
                return "exhaustive", {}
            else:
                print(f"🎯 Medium scene, many images → VOCAB_TREE (balanced)")
                return "vocab_tree", {
                    "num_images": 50,
                    "max_features": 6000,
                    "max_matches": 24576
                }
                
    except Exception as e:
        print(f"⚠️ Database analysis failed: {e}")
        print(f"🔄 Using fallback: VOCAB_TREE")
        return "vocab_tree", {
            "num_images": 50,
            "max_features": 6000,
            "max_matches": 16384
        }
    
if not args.skip_matching:
    os.makedirs(args.source_path + "/distorted/sparse", exist_ok=True)

    ## Feature extraction
    ## Feature extraction - 🔧 OTTIMIZZATO
    feat_extracton_cmd = colmap_command + " feature_extractor \
        --database_path " + args.source_path + "/distorted/database.db \
        --image_path " + args.source_path + "/input \
        --ImageReader.single_camera 1 \
        --ImageReader.camera_model " + args.camera + " \
        --SiftExtraction.use_gpu " + str(use_gpu) + " \
        --SiftExtraction.max_num_features " + str(args.max_features) + " \
        --SiftExtraction.first_octave -1 \
        --SiftExtraction.num_octaves 4 \
        --SiftExtraction.octave_resolution 3"
    exit_code = os.system(feat_extracton_cmd)
    if exit_code != 0:
        logging.error(f"Feature extraction failed with code {exit_code}. Exiting.")
        exit(exit_code)

    if args.matching_strategy == "auto":
        print("🤖 Auto-detecting optimal matching strategy...")
        detected_strategy, detected_params = analyze_features_for_strategy(
            args.source_path + "/distorted/database.db"
        )
        args.matching_strategy = detected_strategy
        
        # Applica parametri rilevati per vocab_tree
        if detected_strategy == "vocab_tree":
            vocab_num_images = detected_params.get("num_images", 50)
            vocab_max_features = detected_params.get("max_features", 6000)
            vocab_max_matches = detected_params.get("max_matches", 16384)
            
    if args.matching_strategy == "exhaustive":
        # Matching exhaustive (originale ma più lento)
        feat_matching_cmd = colmap_command + " exhaustive_matcher \
            --database_path " + args.source_path + "/distorted/database.db \
            --SiftMatching.use_gpu " + str(use_gpu)
            
    elif args.matching_strategy == "sequential":
        # Sequential matching (molto più veloce per video)
        feat_matching_cmd = colmap_command + " sequential_matcher \
            --database_path " + args.source_path + "/distorted/database.db \
            --SiftMatching.use_gpu " + str(use_gpu) + " \
            --SequentialMatching.overlap " + str(args.overlap) + " \
            --SequentialMatching.quadratic_overlap 1"
            
    elif args.matching_strategy == "vocab_tree":

        # Usa parametri auto-rilevati se disponibili
        if 'vocab_num_images' in locals():
            num_imgs = vocab_num_images
            max_feats = vocab_max_features
            max_matches = vocab_max_matches
        else:
            # Parametri di default
            num_imgs = 50
            max_feats = 6000
            max_matches = 16384

        # Vocabulary tree matching (veloce per grandi dataset)
        vocab_tree_path = "/workspace/vocab_trees/vocab_tree_flickr100K_words256K.bin"
        feat_matching_cmd = colmap_command + " vocab_tree_matcher \
            --database_path " + args.source_path + "/distorted/database.db \
            --SiftMatching.use_gpu " + str(use_gpu) + " \
            --VocabTreeMatching.vocab_tree_path " + vocab_tree_path + " \
            --VocabTreeMatching.num_images " + str(num_imgs) + " \
            --VocabTreeMatching.max_num_features " + str(max_feats) + " \
            --SiftMatching.max_num_matches " + str(max_matches)

    exit_code = os.system(feat_matching_cmd)
    if exit_code != 0:
        logging.error(f"Feature matching failed with code {exit_code}. Exiting.")
        exit(exit_code)

    ### Bundle adjustment
    # The default Mapper tolerance is unnecessarily large,
    # decreasing it speeds up bundle adjustment steps.
    mapper_cmd = (colmap_command + " mapper \
        --database_path " + args.source_path + "/distorted/database.db \
        --image_path "  + args.source_path + "/input \
        --output_path "  + args.source_path + "/distorted/sparse \
        --Mapper.ba_global_function_tolerance=0.000001 \
        --Mapper.ba_global_max_num_iterations=50 \
        --Mapper.ba_local_max_num_iterations=10 \
        --Mapper.tri_ignore_two_view_tracks=1 \
        --Mapper.min_num_matches=15")
    
    print("🗺️  Starting bundle adjustment...")
    exit_code = os.system(mapper_cmd)
    if exit_code != 0:
        logging.error(f"Mapper failed with code {exit_code}. Exiting.")
        exit(exit_code)

### Image undistortion
## We need to undistort our images into ideal pinhole intrinsics.
print("📐 Undistorting images...")
img_undist_cmd = (colmap_command + " image_undistorter \
    --image_path " + args.source_path + "/input \
    --input_path " + args.source_path + "/distorted/sparse/0 \
    --output_path " + args.source_path + "\
    --output_type COLMAP")
exit_code = os.system(img_undist_cmd)

if exit_code != 0:
    logging.error(f"Mapper failed with code {exit_code}. Exiting.")
    exit(exit_code)

files = os.listdir(args.source_path + "/sparse")
os.makedirs(args.source_path + "/sparse/0", exist_ok=True)
# Copy each file from the source directory to the destination directory
for file in files:
    if file == '0':
        continue
    source_file = os.path.join(args.source_path, "sparse", file)
    destination_file = os.path.join(args.source_path, "sparse", "0", file)
    shutil.move(source_file, destination_file)

if(args.resize):
    print("Copying and resizing...")

    # Resize images.
    os.makedirs(args.source_path + "/images_2", exist_ok=True)
    os.makedirs(args.source_path + "/images_4", exist_ok=True)
    os.makedirs(args.source_path + "/images_8", exist_ok=True)
    # Get the list of files in the source directory
    files = os.listdir(args.source_path + "/images")
    # Copy each file from the source directory to the destination directory
    for file in files:
        source_file = os.path.join(args.source_path, "images", file)

        destination_file = os.path.join(args.source_path, "images_2", file)
        shutil.copy2(source_file, destination_file)
        exit_code = os.system(magick_command + " mogrify -resize 50% " + destination_file)
        if exit_code != 0:
            logging.error(f"50% resize failed with code {exit_code}. Exiting.")
            exit(exit_code)

        destination_file = os.path.join(args.source_path, "images_4", file)
        shutil.copy2(source_file, destination_file)
        exit_code = os.system(magick_command + " mogrify -resize 25% " + destination_file)
        if exit_code != 0:
            logging.error(f"25% resize failed with code {exit_code}. Exiting.")
            exit(exit_code)

        destination_file = os.path.join(args.source_path, "images_8", file)
        shutil.copy2(source_file, destination_file)
        exit_code = os.system(magick_command + " mogrify -resize 12.5% " + destination_file)
        if exit_code != 0:
            logging.error(f"12.5% resize failed with code {exit_code}. Exiting.")
            exit(exit_code)


