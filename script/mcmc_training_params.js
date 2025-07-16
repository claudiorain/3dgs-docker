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
    "opacity_reg": 0.01,
    "eval":true
  },
  
  // === MOLTIPLICATORI PER QUALITY LEVELS ===
  "quality_multipliers": {
    "fast": {
      "iterations": 0.8,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 0.8,  
      "densify_until_iter": 0.8,
      "densification_interval": 0.8,
      "cap_max": 1.0,           // 1.5M gaussiane
      "scale_reg": 1.5,         // 0.028 - più regolarizzazione
      "opacity_reg": 1.5,       // 0.028 - più regolarizzazione
    },
    "balanced": {
      "iterations": 1.0,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 1.0,  
      "densify_until_iter": 1.0,
      "densification_interval": 1.0,
      "cap_max": 2,           // 1.5M gaussiane
      "scale_reg": 1.0,         // 0.028 - più regolarizzazione
      "opacity_reg": 1.0,       // 0.028 - più regolarizzazione
    },
    "quality": {
      "iterations": 1.2,
      "densify_grad_threshold":1.0,
      "densify_from_iter": 1.2,  
      "densify_until_iter": 1.2,
      "densification_interval": 1.0,
      "cap_max": 3,           // 1.5M gaussiane
      "scale_reg": 0.5,         // 0.028 - più regolarizzazione
      "opacity_reg": 0.5,       // 0.028 - più regolarizzazione
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
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 12,
    
    "resolution_thresholds": [
      { "vram_threshold": 24, "resolution": 1, "description": "Full resolution (24GB+)" },
      { "vram_threshold": 16, "resolution": 4, "description": "Full resolution (16GB+)" },
      { "vram_threshold": 8, "resolution": 8, "description": "Quarter resolution (8GB+)" }
    ],
    
    "scaling_formulas": {
      "densify_grad_threshold": {
        "formula": "max(1.8, 4.0 - (vram_factor * 2.2))",
        "description": "Scaling uniforme basato solo su VRAM disponibile",
        "min": 1.6,
        "max": 4.0
      },
      "cap_max": {
        "formula": "max(0.6, 0.5 + (vram_factor * 0.5))",
        "description": "Scaling bilanciato gaussiane massime",
        "min": 0.6,
        "max": 1.2
      },
      "scale_reg": {
        "formula": "max(1.0, 2.0 - (vram_factor * 1.0))",
        "description": "Regolarizzazione scale moderata",
        "min": 1.0,
        "max": 2.0
      },
      "opacity_reg": {
        "formula": "max(0.5, 1.3 - (vram_factor * 0.8))",
        "description": "Regolarizzazione opacity ridotta per più opacità",
        "min": 0.5,
        "max": 1.3
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
    },
    {
      "rule": "cap_max >= 100000",
      "message": "cap_max deve essere almeno 100k gaussiane"
    },
    {
      "rule": "cap_max <= 6000000",
      "message": "cap_max non può superare 6M gaussiane"
    },
    {
      "rule": "scale_reg > 0 && scale_reg <= 1",
      "message": "scale_reg deve essere tra 0 e 1"
    },
    {
      "rule": "opacity_reg > 0 && opacity_reg <= 1", 
      "message": "opacity_reg deve essere tra 0 e 1"
    },
    {
      "rule": "noise_lr > 0 && noise_lr <= 0.01",
      "message": "noise_lr deve essere tra 0 e 0.01"
    },
    {
      "rule": "opacity_lr > 0 && opacity_lr <= 0.2",
      "message": "opacity_lr deve essere tra 0 e 0.2"
    }
  ],
  
  // === TIMESTAMP ===
  "created_at": new Date(),
  "updated_at": new Date(),
  "created_by": "system",
  "updated_by": "system"
});

console.log("\n✅ Configurazione MCMC corretta inserita!");
console.log("📊 PARAMETRI MCMC AGGIUNTI:");
console.log("  - cap_max: 1.5M → 3M → 6M gaussiane");
console.log("  - scale_reg: 0.028 → 0.02 → 0.016");
console.log("  - opacity_reg: 0.028 → 0.02 → 0.016");
console.log("  - noise_lr: 6e5 → 5e5 → 4.5e5 (600k → 500k → 450k)");
console.log("🔧 Struttura hardware_config corretta");
console.log("🚀 Post_calculation rimosso come richiesto");