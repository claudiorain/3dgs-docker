db.training_params.deleteOne({
  "algorithm_name": "gaussian_splatting_original"
});

db.training_params.insertOne({
  // === IDENTIFICAZIONE ALGORITMO ===
  "algorithm_name": "gaussian_splatting_original",
  "display_name": "3D Gaussian Splatting (Fixed Iterations)",
  "version": "1.5",
  "active": true,
  
  // === METADATI ===
  "metadata": {
    "description": "Algoritmo con separazione pulita training/preprocessing params",
    "paper_reference": "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    "repository": "https://github.com/graphdeco-inria/gaussian-splatting",
    "supported_platforms": ["linux", "windows"],
    "min_gpu_memory_gb": 8,
    "notes": "Preprocessing params separati da training params per maggiore chiarezza"
  },
  
  // === VALORI BASE (livello "balanced") ===
  "base_params": {
    "iterations": 30000,
    "densify_grad_threshold": 0.0002,
    "densification_interval": 100,
    "densify_until_iter": 15000,
    "eval": true
  },
  
  // === QUALITY MULTIPLIERS: SOLO training parameters ===
  "quality_multipliers": {
    "fast": {
      "iterations": 0.8,
      "densify_grad_threshold": 1.2
    },
    "balanced": {
      "iterations": 1.0,
      "densify_grad_threshold": 1.0
    },
    "quality": {
      "iterations": 1.2,
      "densify_grad_threshold": 0.8
    }
  },
  
  // 🆕 PREPROCESSING PARAMS: Separati e chiari
  "preprocessing_params": {
    "fast": {
      "target_width": 1920,
      "target_height": 1080,
      "target_frames": 150
    },
    "balanced": {
      "target_frames": 200,
      "target_width": 2560,
      "target_height": 1440,
    },
    "quality": {
      "target_width": 3840,
      "target_height": 2160,
      "target_frames": 250
    }
  },
  
  // === HARDWARE CONFIG ===
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 8,
    
    "resolution_thresholds": [
      { "vram_threshold": 24, "target_width": 3840,"target_height": 2160, "description": "Full resolution (24GB+)" },
      { "vram_threshold": 20, "target_width": 2560,"target_height": 1440, "description": "Quarter resolution (16GB+)" },
      { "vram_threshold": 16, "target_width": 1280,"target_height": 720, "description": "Quarter resolution (16GB+)" },
      { "vram_threshold": 8, "target_width": 1280,"target_height": 720, "description": "Eighth resolution (8GB+)" }
    ],
    
    "scaling_formulas": {
      "densify_grad_threshold": {
        "description": "Balanced: scaling moderato",
        "formula": "max(1.0, 2.5 - (vram_factor * 1.5))",
        "min": 1.0,
        "max": 4.0
      }
    }
  },
  
  // === VALIDAZIONI ===
  "validation_rules": [
    {
      "rule": "densify_until_iter < iterations",
      "message": "densify_until_iter deve essere minore di iterations"
    },
    {
      "rule": "densify_until_iter <= iterations * 0.8",
      "message": "densify_until_iter non può superare 80% delle iterazioni"
    }
  ],
  
  // === TIMESTAMP ===
  "created_at": new Date(),
  "updated_at": new Date(),
  "created_by": "system",
  "updated_by": "system"
});