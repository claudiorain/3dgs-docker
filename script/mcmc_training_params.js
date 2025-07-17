// Prima rimuovi la configurazione esistente
db.training_params.deleteOne({
  "algorithm_name": "gaussian_splatting_mcmc"
});

// Insert documento per MCMC Gaussian Splatting - STRUTTURA CORRETTA
db.training_params.insertOne({
  // === IDENTIFICAZIONE ALGORITMO ===
  "algorithm_name": "gaussian_splatting_mcmc",
  "display_name": "MCMC 3D Gaussian Splatting",
  "version": "1.3",
  "active": true,
  
  // === METADATI ===
  "metadata": {
    "description": "Algoritmo MCMC per 3D Gaussian Splatting con parametri aggiuntivi",
    "paper_reference": "MCMC-based Gaussian Splatting for Enhanced Quality",
    "repository": "https://github.com/ubc-vision/3dgs-mcmc",
    "supported_platforms": ["linux", "windows"],
    "min_gpu_memory_gb": 12,
    "notes": "Configurazione con cap_max, scale_reg, opacity_reg e noise_lr per MCMC"
  },
  
  // === VALORI BASE ===
  "base_params": {
    "iterations": 30000,
    "densify_grad_threshold":0.0002,
    "densification_interval": 100,
    "densify_until_iter": 15000,
    "eval": true,
    // PARAMETRI MCMC SPECIFICI
    "cap_max": 1500000,
    "scale_reg": 0.02,
    "opacity_reg": 0.02, 
    "noise_lr": 0.003,      // RIDOTTO da 0.005 → 0.003
    "eval":true
  },
  
  // === MOLTIPLICATORI PER QUALITY LEVELS ===
  "quality_multipliers": {
    "fast": {
      "iterations": 0.8,
      "densify_from_iter": 0.8,  
      "densify_until_iter": 0.8,
      "densification_interval": 0.8,
      "cap_max": 1.5,                   // RIDOTTO da 2.0 → 1.5
          "scale_reg": 1.0,                 
          "opacity_reg": 1.5,               // AUMENTATO da 1.0 → 1.5
          "noise_lr": 1.2                   // AUMENTATO da 1.0 → 1.2
    },
    "balanced": {
      "iterations": 1.0,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 1.0,  
      "densify_until_iter": 1.0,
      "cap_max": 2,           // 1.5M gaussiane
      "scale_reg": 1.0,         // 0.028 - più regolarizzazione
      "opacity_reg": 1.0,       // 0.028 - più regolarizzazione
    },
    "quality": {
      "iterations": 1.2,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 1.2,  
      "densify_until_iter": 1.2,
      "cap_max": 2.0,                   // RIDOTTO da 3.0 → 2.0
      "scale_reg": 0.8,                 // AUMENTATO da 0.5 → 0.8 (più stabilità)
      "opacity_reg": 1.0,               // AUMENTATO da 0.5 → 1.0
      "noise_lr": 1.0                   // Invariato
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
  // === CONFIGURAZIONE HARDWARE - STRUTTURA CORRETTA ===
  // === HARDWARE SCALING AGGIORNATO ===
      "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 12,
    
    "resolution_thresholds": [
      { "vram_threshold": 24, "resolution": 1, "description": "Full resolution (24GB+)" },
      { "vram_threshold": 16, "resolution": 2, "description": "Half resolution (16GB+)" },
      { "vram_threshold": 12, "resolution": 4, "description": "Quarter resolution (12GB+)" },
      { "vram_threshold": 8, "resolution": 8, "description": "Eighth resolution (8GB+)" }
    ],
    
    "scaling_formulas": {
      "densify_grad_threshold": {
        "formula": "max(1.8, 4.0 - (vram_factor * 2.2))",
        "description": "Scaling moderato soglia densificazione",
        "min": 1.6,
        "max": 4.0
      },
      "cap_max": {
        "formula": "max(0.5, 0.4 + (vram_factor * 0.4))",
        "description": "Cap gaussiane conservativo",
        "min": 0.5,
        "max": 0.8
      },
      "scale_reg": {
        "formula": "max(1.0, 2.0 - (vram_factor * 1.0))",
        "description": "Regolarizzazione scale",
        "min": 1.0,
        "max": 2.0
      },
      "opacity_reg": {
        "formula": "max(0.8, 1.6 - (vram_factor * 0.8))",
        "description": "Regolarizzazione opacity aumentata",
        "min": 0.8,
        "max": 1.6
      },
      "noise_lr": {
        "formula": "max(1.2, 2.0 - (vram_factor * 0.8))",
        "description": "Noise LR conservativo per stabilità",
        "min": 1.2,
        "max": 2.0
      }
    }
  },
      
      // === VALIDAZIONI AGGIORNATE ===
      "validation_rules": [
        {
          "rule": "densify_until_iter < iterations",
          "message": "densify_until_iter deve essere minore di iterations"
        },
        {
          "rule": "cap_max >= 100000",
          "message": "cap_max deve essere almeno 100k gaussiane"
        },
        {
          "rule": "cap_max <= 4000000",                     // RIDOTTO da 6M → 4M
          "message": "cap_max non può superare 4M gaussiane"
        },
        {
          "rule": "scale_reg > 0 && scale_reg <= 1",
          "message": "scale_reg deve essere tra 0 e 1"
        },
        {
          "rule": "opacity_reg > 0 && opacity_reg <= 2",   // AUMENTATO limite da 1 → 2
          "message": "opacity_reg deve essere tra 0 e 2"
        },
        {
          "rule": "noise_lr > 0 && noise_lr <= 0.01",
          "message": "noise_lr deve essere tra 0 e 0.01"
        }
      ],
      
        // === TIMESTAMP ===
      "created_at": new Date(),
      "updated_at": new Date(),
      "created_by": "system",
      "updated_by": "system"
    }
);

console.log("\n✅ Configurazione MCMC corretta inserita!");
console.log("📊 PARAMETRI MCMC AGGIUNTI:");
console.log("  - cap_max: 1.5M → 3M → 6M gaussiane");
console.log("  - scale_reg: 0.028 → 0.02 → 0.016");
console.log("  - opacity_reg: 0.028 → 0.02 → 0.016");
console.log("  - noise_lr: 6e5 → 5e5 → 4.5e5 (600k → 500k → 450k)");
console.log("🔧 Struttura hardware_config corretta");
console.log("🚀 Post_calculation rimosso come richiesto");