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
    "iterations": 30000,                 // ✅ SEMPRE FISSO
    "densify_grad_threshold": 0.0002,
    "densification_interval": 100,
    "densify_until_iter": 15000,
    "opacity_lr": 0.05,
    "scaling_lr": 0.005,
    "rotation_lr": 0.001,
    "percent_dense": 0.01,
    "eval": true
  },
  
  // === QUALITY MULTIPLIERS: TARATURA QUALITÀ SU TUTTI I PARAMETRI ===
  "quality_multipliers": {
    "fast": {
      // FAST = Massima sicurezza VRAM, sacrifica qualità
      "densify_grad_threshold": 1.4,      // Soglia più alta = meno gaussiane
      "densification_interval": 1.3,      // Intervallo più lungo = meno densificazione
      "densify_until_iter": 0.8,          // Finestra ridotta
      "opacity_lr": 1.2,                  // Convergenza leggermente più veloce
      "scaling_lr": 1.1,
      "rotation_lr": 1.1
      // iterations: RIMANE 30000 (no moltiplicatore)
    },
    "balanced": {
      // BALANCED = Equilibrio sicurezza/qualità
      "densify_grad_threshold": 1.0,
      "densification_interval": 1.0,
      "densify_until_iter": 1.0,
      "opacity_lr": 1.0,
      "scaling_lr": 1.0,
      "rotation_lr": 1.0
    },
    "quality": {
      // QUALITY = Minima sicurezza, massima qualità
      "densify_grad_threshold": 0.9,      // Soglia più bassa = più gaussiane
      "densification_interval": 0.9,      // Intervallo più breve = più densificazione
      "densify_until_iter": 1.1,          // Finestra estesa
      "opacity_lr": 0.9,                  // Convergenza più stabile
      "scaling_lr": 0.9,
      "rotation_lr": 0.9
      // iterations: RIMANE 30000 (no moltiplicatore)
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
        "description": "Scaling uniforme basato solo su VRAM disponibile",
        "formula": "max(1.8, 4.0 - (vram_factor * 2.2))",
        "min": 1.8,
        "max": 4.0
      },
      "densification_interval": {
        "description": "Scaling uniforme per frequenza densificazione",
        "formula": "max(1.4, 2.8 - (vram_factor * 1.4))",
        "min": 1.4,
        "max": 2.8
      },
      "densify_until_iter": {
        "description": "Scaling uniforme per finestra densificazione",
        "formula": "max(0.6, 1.0 - (vram_factor * 0.4))",
        "min": 0.6,
        "max": 1.0
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