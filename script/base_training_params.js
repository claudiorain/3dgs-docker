// Configurazione CORRETTA: Scaling differenziato per quality level
db.training_params.deleteOne({
  "algorithm_name": "gaussian_splatting_original"
});

db.training_params.insertOne({
  // === IDENTIFICAZIONE ALGORITMO ===
  "algorithm_name": "gaussian_splatting_original",
  "display_name": "3D Gaussian Splatting (Fixed Iterations)",
  "version": "1.4",
  "active": true,
  
  // === METADATI ===
  "metadata": {
    "description": "Algoritmo con iterations fisse (30k) e quality multipliers completi",
    "paper_reference": "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    "repository": "https://github.com/graphdeco-inria/gaussian-splatting",
    "supported_platforms": ["linux", "windows"],
    "min_gpu_memory_gb": 8,
    "notes": "Iterations sempre 30k. Quality levels differiscono per aggressività protezione OOM."
  },
  
  // === VALORI BASE (livello "balanced") ===
  "base_params": {
    "iterations": 30000,
    "densify_grad_threshold":0.0002,
    "densification_interval": 100,
    "densify_until_iter": 15000,
    "eval": true
  },
  
  // === QUALITY MULTIPLIERS: TARATURA QUALITÀ SU TUTTI I PARAMETRI ===
  "quality_multipliers": {
    "fast": {
      "iterations": 0.8,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 0.8,  
      "densify_until_iter": 0.8,
      "densification_interval": 0.8
    },
    "balanced": {
      "iterations": 1.0,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 1.0,    
      "densify_until_iter": 1.0,
      "densification_interval": 1.0
    },
    "quality": {
      "iterations": 1.2,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 1.2,    
      "densify_until_iter": 1.2,
      "densification_interval": 1.2
    }
  },
  
  // === OVERRIDE PER QUALITÀ ===
  "quality_overrides": {
    "fast": {
      "resolution": 4                   
    },
    "balanced": {
      "resolution": 2
    },
    "quality": {
      "resolution": 1
    }
  },
  
  // === HARDWARE CONFIG: SCALING DIFFERENZIATO PER QUALITY LEVEL ===
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 8,
    
    "resolution_thresholds": [
      { "vram_threshold": 24, "resolution": 1, "description": "Full resolution (24GB+)" },
      { "vram_threshold": 16, "resolution": 4, "description": "Full resolution (16GB+)" },
      { "vram_threshold": 8, "resolution": 8, "description": "Quarter resolution (8GB+)" }
    ],
    
    // ✅ SCALING HARDWARE UNIFORME (indipendente da quality level)
    "scaling_formulas": {
      "densify_grad_threshold": {
          "description": "Balanced: scaling moderato",
          "formula": "max(1.6, 4.0 - (vram_factor * 2.2))",
          "min": 1.6,
          "max": 4.0
      },
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