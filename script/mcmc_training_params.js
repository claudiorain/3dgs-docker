// CONFIGURAZIONE MCMC OTTIMIZZATA PER MEMORIA
// Prima rimuovi la configurazione esistente
db.training_params.deleteOne({
  "algorithm_name": "gaussian_splatting_mcmc"
});

// Insert documento per MCMC Gaussian Splatting - MEMORY OPTIMIZED
db.training_params.insertOne({
  // === IDENTIFICAZIONE ALGORITMO ===
  "algorithm_name": "gaussian_splatting_mcmc",
  "display_name": "MCMC 3D Gaussian Splatting",
  "version": "1.4-memory-optimized",
  "active": true,
  
  // === METADATI ===
  "metadata": {
    "description": "Algoritmo MCMC per 3D Gaussian Splatting ottimizzato per memoria",
    "paper_reference": "MCMC-based Gaussian Splatting for Enhanced Quality",
    "repository": "https://github.com/ubc-vision/3dgs-mcmc",
    "supported_platforms": ["linux", "windows"],
    "min_gpu_memory_gb": 12,
    "notes": "Configurazione memory-friendly con cap_max ridotti e regolarizzazione aumentata"
  },
  
  // === VALORI BASE OTTIMIZZATI ===
  "base_params": {
    "iterations": 30000,
    "densify_grad_threshold": 0.0002,
    "densification_interval": 100,
    "densify_until_iter": 15000,
    "eval": true,
    // PARAMETRI MCMC OTTIMIZZATI PER MEMORIA
    "cap_max": 800000,        // RIDOTTO da 1.5M → 800K (memoria sicura)
    "scale_reg": 0.025,       // AUMENTATO da 0.02 → 0.025 (più regolarizzazione)
    "opacity_reg": 0.025,     // AUMENTATO da 0.02 → 0.025 (più regolarizzazione)
    "noise_lr": 0.002,        // RIDOTTO da 0.003 → 0.002 (più stabilità)
    "eval": true
  },
  
  // === MOLTIPLICATORI CONSERVATIVI ===
  "quality_multipliers": {
    "fast": {
      "densify_grad_threshold": 1.2,    // RALLENTATO da 0.8 → 1.2
      "cap_max": 0.8,                   // RIDOTTO 800K * 0.8 = 640K gaussiane
      "scale_reg": 1.2,                 // AUMENTATO per più stabilità
      "opacity_reg": 1.5,               // AUMENTATO per pulizia
      "noise_lr": 1.5                   // AUMENTATO per convergenza veloce
    },
    "balanced": {
      "densify_grad_threshold": 1.0,
      "cap_max": 1.25,                  // RIDOTTO da 2.0 → 1.25 (1M gaussiane max)
      "scale_reg": 1.0,                 
      "opacity_reg": 1.2,               // AUMENTATO da 1.0 → 1.2
      "noise_lr": 1.0
    },
    "quality": {
      "densify_grad_threshold": 0.8,    // RIDOTTO da 1.2 → 1.0
      "cap_max": 1.8,                   // RIDOTTO da 2.0 → 1.8 (1.44M gaussiane)
      "scale_reg": 0.9,                 // AUMENTATO da 0.8 → 0.9
      "opacity_reg": 1.0,               
      "noise_lr": 0.8                   // RIDOTTO per stabilità
    }
  },
  
  // === PREPROCESSING MEMORY-AWARE ===
  "preprocessing_params": {
    "fast": {
      "target_width": 1280,    // RIDOTTO da 1920
      "target_height": 720     // RIDOTTO da 1080
    },
    "balanced": {
      "target_width": 1920,    // RIDOTTO da 2560
      "target_height": 1080    // RIDOTTO da 1440
    },
    "quality": {
      "target_width": 2560,    // RIDOTTO da 3840
      "target_height": 1440    // RIDOTTO da 2160
    }
  },
  
  // === HARDWARE CONFIG ULTRA-CONSERVATIVO ===
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 12,
    
    "resolution_thresholds": [
      { "vram_threshold": 24, "target_width": 2560, "target_height": 1440, "description": "High resolution (24GB+)" },
      { "vram_threshold": 20, "target_width": 1920, "target_height": 1080, "description": "Full HD (20GB+)" },
      { "vram_threshold": 16, "target_width": 1280, "target_height": 720, "description": "HD (16GB+)" },
      { "vram_threshold": 12, "target_width": 960, "target_height": 540, "description": "Low HD (12GB+)" }
    ],
    
    "scaling_formulas": {
      "densify_grad_threshold": {
        "description": "Conservative densification",
        "formula": "max(1.2, 3.0 - (vram_factor * 1.8))",  // Più conservativo
        "min": 1.2,
        "max": 3.0
      },
      "cap_max": {
        "formula": "max(0.3, 0.2 + (vram_factor * 0.3))",  // MOLTO conservativo
        "description": "Cap gaussiane ultra-conservativo",
        "min": 0.3,  // 240K gaussiane minimo
        "max": 0.5   // 400K gaussiane massimo
      },
      "scale_reg": {
        "formula": "max(1.2, 2.5 - (vram_factor * 1.3))",  // Più regolarizzazione
        "description": "Regolarizzazione scale aumentata",
        "min": 1.2,
        "max": 2.5
      },
      "opacity_reg": {
        "formula": "max(1.0, 2.0 - (vram_factor * 1.0))",  // Regolarizzazione alta
        "description": "Regolarizzazione opacity forte",
        "min": 1.0,
        "max": 2.0
      },
      "noise_lr": {
        "formula": "max(1.5, 2.5 - (vram_factor * 1.0))",  // Noise alto per compensare
        "description": "Noise LR compensativo",
        "min": 1.5,
        "max": 2.5
      }
    }
  },
  
  // === VALIDAZIONI AGGIORNATE PER MEMORIA ===
  "validation_rules": [
    {
      "rule": "densify_until_iter < iterations",
      "message": "densify_until_iter deve essere minore di iterations"
    },
    {
      "rule": "cap_max >= 50000",                    // RIDOTTO limite minimo
      "message": "cap_max deve essere almeno 50k gaussiane"
    },
    {
      "rule": "cap_max <= 2000000",                  // RIDOTTO da 4M → 2M
      "message": "cap_max non può superare 2M gaussiane per stabilità memoria"
    },
    {
      "rule": "scale_reg > 0 && scale_reg <= 1",
      "message": "scale_reg deve essere tra 0 e 1"
    },
    {
      "rule": "opacity_reg > 0 && opacity_reg <= 2",
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
  "updated_by": "memory_optimization"
});

console.log("\n✅ Configurazione MCMC MEMORY-OPTIMIZED inserita!");
console.log("🧠 OTTIMIZZAZIONI MEMORIA:");
console.log("  - cap_max BASE: 1.5M → 800K gaussiane");
console.log("  - cap_max BALANCED: 1.6M → 1M gaussiane (era 3M!)");  
console.log("  - cap_max QUALITY: 1.8M → 1.44M gaussiane");
console.log("  - Regolarizzazione aumentata per compensare");
console.log("  - Risoluzioni ridotte per tutti i livelli");
console.log("🎯 Hardware scaling ultra-conservativo");
console.log("⚡ Dovrebbe eliminare gli OOM su balanced!");

// === SCRIPT DI VERIFICA MEMORIA ===
console.log("\n📊 STIMA UTILIZZO MEMORIA:");
console.log("Fast:     640K gaussiani  ≈ 8-10GB VRAM");
console.log("Balanced: 1M gaussiani    ≈ 12-14GB VRAM"); 
console.log("Quality:  1.44M gaussiani ≈ 16-18GB VRAM");
console.log("\n🔧 Se ancora OOM su balanced, riduci ulteriormente cap_max a 0.8!");