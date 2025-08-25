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
    "densify_from_iter":500,
    "eval": true
  },
  
  // === QUALITY MULTIPLIERS: SOLO training parameters ===
 "quality_multipliers": {
  "fast": {
    "iterations": 0.67          // 30000 * 0.5 = 15000
  },
  "balanced": {
    "iterations": 0.85
  },
  "quality": {
    "iterations": 1.0
  }
},
  
  // 🆕 PREPROCESSING PARAMS: Separati e chiari
  "preprocessing_params": {
    "fast": {
      "target_width": 1280,
      "target_height": 720
    },
    "balanced": {
      "target_width": 2560,
      "target_height": 1440,
    },
    "quality": {
      "target_width": 2560,
      "target_height": 1440
    }
  },
  
  // === HARDWARE CONFIG ===
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 8,
    "resolution_thresholds": [
      { "vram_threshold": 16, "target_width": 2560,"target_height": 1440, "description": "Full resolution (24GB+)" },

    ],
    
    "scaling_formulas": {
    
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
