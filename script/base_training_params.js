// Insert documento per Gaussian Splatting Originale
// Collection: training_params
db.training_params.deleteOne({
  "algorithm_name": "gaussian_splatting_original"
});

db.training_params.insertOne({
  // === IDENTIFICAZIONE ALGORITMO ===
  "algorithm_name": "gaussian_splatting_original",
  "display_name": "3D Gaussian Splatting (Original)",
  "version": "1.0",
  "active": true,
  
  // === METADATI ===
  "metadata": {
    "description": "Algoritmo originale 3D Gaussian Splatting",
    "paper_reference": "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    "repository": "https://github.com/graphdeco-inria/gaussian-splatting",
    "supported_platforms": ["linux", "windows"],
    "min_gpu_memory_gb": 8,
    "notes": "Implementazione di riferimento, crescita dinamica gaussiane"
  },
  
  // === VALORI BASE (livello "standard") ===
  "base_params": {
    "iterations": 30000,
    "densify_grad_threshold": 0.0002,
    "densification_interval": 100,
    "densify_until_iter": 15000,
    "opacity_lr": 0.05,
    "scaling_lr": 0.005,
    "rotation_lr": 0.001,
    "position_lr_init": 0.00016,
    "position_lr_delay_mult": 0.01,
    "percent_dense": 0.01,
    "lambda_dssim": 0.2,
    "sh_degree": 3,
    "eval": true
  },
  
  // === MOLTIPLICATORI PER LIVELLI DI QUALITÀ (incrementi graduali 10-15%) ===
  "quality_multipliers": {
    "draft": {
      "densify_grad_threshold": 1.15,     // +15% meno sensibile
      "densification_interval": 1.10,     // +10% meno frequente
      "densify_until_iter": 0.90,         // -10% durata (13.5k)
      "opacity_lr": 1.15,                 // +15% convergenza rapida
      "scaling_lr": 1.15,                 // +15%
      "rotation_lr": 1.15,                // +15%
    },
    "standard": {
      "densify_grad_threshold": 1.0,      // 0.0002 (baseline)
      "densification_interval": 1.0,      // 100 (baseline)
      "densify_until_iter": 1.0,          // 15k (baseline)
      "opacity_lr": 1.0,                  // 0.05 (baseline)
      "scaling_lr": 1.0,                  // 0.005 (baseline)
      "rotation_lr": 1.0,                 // 0.001 (baseline)
    },
    "high": {
      "densify_grad_threshold": 0.90,     // -10% più sensibile
      "densification_interval": 0.90,     // -10% più frequente
      "densify_until_iter": 1.10,         // +10% durata (16.5k)
      "opacity_lr": 0.90,                 // -10% più stabile
      "scaling_lr": 0.90,                 // -10%
      "rotation_lr": 0.90,                // -10%
    },
    "ultra": {
      "densify_grad_threshold": 0.80,     // -20% molto sensibile
      "densification_interval": 0.85,     // -15% molto frequente
      "densify_until_iter": 1.20,         // +20% durata (18k)
      "opacity_lr": 0.80,                 // -20% molto stabile
      "scaling_lr": 0.80,                 // -20%
      "rotation_lr": 0.80,                // -20%
    }
  },
  
  // === OVERRIDE PER QUALITÀ (valori sostitutivi) ===
  "quality_overrides": {
    "draft": {
      "resolution": -1
    },
    "standard": {
      "resolution": 1  // Full resolution
    },
    "high": {
      "resolution": 1   // Full resolution
    },
    "ultra": {
      "resolution": 1   // Full resolution
    }
  },
  
  // === CONFIGURAZIONE HARDWARE ===
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 8,
    
    // Soglie per resolution auto - CORRETTI I NOMI DEI CAMPI
    "resolution_thresholds": [
      { "vram_threshold": 24, "resolution": 1, "description": "Full resolution" },
      { "vram_threshold": 16, "resolution": 1, "description": "Full resolution" },
      { "vram_threshold": 12, "resolution": 2, "description": "Reduced resolution" },
      { "vram_threshold": 8, "resolution": 4, "description": "Low resolution" },
      { "vram_threshold": 0, "resolution": 8, "description": "Minimal resolution" }
    ],
    
    // Formule per moltiplicatori hardware
     "scaling_formulas": {
      "densify_grad_threshold": {
        "formula": "max(1.3, 2.5 - (vram_factor * 1.2))",
        "description": "Meno VRAM = threshold molto più alto (molte meno gaussiane)",
        "min": 1.3,
        "max": 2.5
      },
      "densification_interval": {
        "formula": "max(1.2, 2.2 - (vram_factor * 1.0))",
        "description": "Meno VRAM = densifica molto meno spesso",
        "min": 1.2,
        "max": 2.2
      },
      "densify_until_iter": {
        "formula": "max(0.65, 1.05 - (vram_factor * 0.4))",
        "description": "Meno VRAM = densifica per molto meno tempo",
        "min": 0.65,
        "max": 1.05
      }
    }
  },
  
  // === PARAMETRI CALCOLATI POST-QUALITÀ ===
  "post_calculation": {

  },
  
  // === LIMITI HARDWARE (solo stime, non parametri) ===
  "hardware_limits": {
    "estimated_gaussians_per_gb": 220000,
    "description": "Stima gaussiane per GB VRAM (crescita dinamica)"
  },
  
  // === VALIDAZIONI ===
  "validation_rules": [
    {
      "rule": "densify_until_iter < iterations",
      "message": "densify_until_iter deve essere minore di iterations"
    },
    {
      "rule": "densify_from_iter < densify_until_iter", 
      "message": "densify_from_iter deve essere minore di densify_until_iter"
    },
    {
      "rule": "densify_until_iter <= iterations * 0.75",
      "message": "densify_until_iter non può superare 75% delle iterazioni"
    },
    {
      "rule": "iterations >= 1000",
      "message": "Minimo 1000 iterazioni richieste"
    }
  ],
  
  // === TIMESTAMP ===
  "created_at": new Date(),
  "updated_at": new Date(),
  "created_by": "system",
  "updated_by": "system"
});

// Verifica inserimento
db.training_params.findOne({
  "algorithm_name": "gaussian_splatting_original",
  "active": true
});

// Output esperato:
// {
//   "_id": ObjectId("..."),
//   "algorithm_name": "gaussian_splatting_original",
//   "display_name": "3D Gaussian Splatting (Original)",
//   ...
// }