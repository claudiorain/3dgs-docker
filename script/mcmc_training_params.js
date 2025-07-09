// Prima rimuovi la configurazione esistente
db.training_params.deleteOne({
  "algorithm_name": "gaussian_splatting_mcmc"
});

// Insert documento per MCMC Gaussian Splatting - FIX OPACITY CORRETTO
// Collection: training_params

db.training_params.insertOne({
  // === IDENTIFICAZIONE ALGORITMO ===
  "algorithm_name": "gaussian_splatting_mcmc",
  "display_name": "MCMC 3D Gaussian Splatting",
  "version": "1.2",
  "active": true,
  
  // === METADATI ===
  "metadata": {
    "description": "Algoritmo MCMC per 3D Gaussian Splatting - Fix opacity per meno trasparenze",
    "paper_reference": "MCMC-based Gaussian Splatting for Enhanced Quality",
    "repository": "https://github.com/ubc-vision/3dgs-mcmc",
    "supported_platforms": ["linux", "windows"],
    "min_gpu_memory_gb": 12,
    "notes": "Configurazione con opacity_lr aumentato per gaussiane più opache e meno trasparenze"
  },
  // === VALORI BASE - FIX OPACITY ===
  "base_params": {
    "iterations": 30000,
    "cap_max": 1500000,
    "scale_reg": 0.02,
    "opacity_reg": 0.02,                   // Ridotto da 0.005 (meno regolarizzazione)
    "noise_lr": 0.004,
    "densify_grad_threshold": 0.00015,      // Ancora più sensibile
    "densification_interval": 100,
    "densify_until_iter": 18000,
    "opacity_lr": 0.08,                     // AUMENTATO da 0.03 a 0.08 per più opacità
    "scaling_lr": 0.005,
    "rotation_lr": 0.001,
    "position_lr_init": 0.00016,
    "position_lr_delay_mult": 0.01,
    "percent_dense": 0.005,                 // Ridotto da 0.01 per densificare più facilmente
    "lambda_dssim": 0.2,
    "sh_degree": 3,
    "eval": true
  },
  
  // === MOLTIPLICATORI - FIX OPACITY LOGIC ===
  "quality_multipliers": {
    "draft": {
      "iterations": 0.75,                 // 22.5k
      "cap_max": 0.50,                    // 750k
      "scale_reg": 1.50,
      "opacity_reg": 2.0,                 // PIÙ regolarizzazione per draft
      "noise_lr": 1.25,
      "densify_grad_threshold": 1.30,
      "densification_interval": 1.25,
      "densify_until_iter": 0.75,
      "opacity_lr": 0.75,                 // RIDOTTO per draft (meno opacità)
      "scaling_lr": 1.25,
      "rotation_lr": 1.25,
      "position_lr_init": 1.20
    },
    "standard": {
      "iterations": 1.0,                  // 30k
      "cap_max": 1.0,                     // 1.5M
      "scale_reg": 1.0,
      "opacity_reg": 1.0,                 // 0.001 baseline
      "noise_lr": 1.0,
      "densify_grad_threshold": 1.0,
      "densification_interval": 1.0,
      "densify_until_iter": 1.0,
      "opacity_lr": 1.0,                  // 0.08 baseline
      "scaling_lr": 1.0,
      "rotation_lr": 1.0,
      "position_lr_init": 1.0
    },
    "high": {
      "iterations": 1.10,                 // 33k
      "cap_max": 1.20,                    // 1.8M
      "scale_reg": 0.90,
      "opacity_reg": 0.70,                // MENO regolarizzazione
      "noise_lr": 0.95,
      "densify_grad_threshold": 0.90,
      "densification_interval": 0.90,
      "densify_until_iter": 1.10,
      "opacity_lr": 1.15,                 // AUMENTATO per più opacità
      "scaling_lr": 0.90,
      "rotation_lr": 0.90,
      "position_lr_init": 0.95
    },
    "ultra": {
      "iterations": 1.15,                 // 34.5k
      "cap_max": 1.35,                    // 2M
      "scale_reg": 0.75,
      "opacity_reg": 0.50,                // MOLTO meno regolarizzazione
      "noise_lr": 0.90,
      "densify_grad_threshold": 0.80,
      "densification_interval": 0.85,
      "densify_until_iter": 1.15,
      "opacity_lr": 1.25,                 // MOLTO aumentato per massima opacità
      "scaling_lr": 0.85,
      "rotation_lr": 0.85,
      "position_lr_init": 0.90
    }
  },
  
  // === OVERRIDE PER QUALITÀ ===
  "quality_overrides": {
    "draft": {
      "resolution": -1
    },
    "standard": {
      "resolution": 1
    },
    "high": {
      "resolution": 1
    },
    "ultra": {
      "resolution": 1
    }
  },
  
  // === CONFIGURAZIONE HARDWARE ===
  "hardware_config": {
    "baseline_vram_gb": 24,
    "min_vram_gb": 12,
    
    "resolution_thresholds": [
      { "vram_threshold": 24, "resolution": 1, "description": "Full resolution" },
      { "vram_threshold": 16, "resolution": 2, "description": "Half resolution" },
      { "vram_threshold": 12, "resolution": 4, "description": "Quarter resolution" },
      { "vram_threshold": 0, "resolution": 8, "description": "Minimal resolution" }
    ],
    
    "scaling_formulas": {
      "cap_max": {
        "formula": "max(0.6, 0.5 + (vram_factor * 0.5))",
        "description": "Scaling bilanciato gaussiane",
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
      },
      "noise_lr": {
        "formula": "max(0.7, 0.9 + (vram_factor * 0.3))",
        "description": "Noise LR bilanciato",
        "min": 0.7,
        "max": 1.0
      },
      "densify_grad_threshold": {
        "formula": "max(1.1, 2.5 - (vram_factor * 1.4))",
        "description": "Threshold più basso per più gaussiane",
        "min": 1.1,
        "max": 2.5
      },
      "densification_interval": {
        "formula": "max(1.2, 2.5 - (vram_factor * 1.3))",
        "description": "Densificazione frequenza bilanciata",
        "min": 1.2,
        "max": 2.5
      },
      "densify_until_iter": {
        "formula": "max(0.6, 0.9 - (vram_factor * 0.3))",
        "description": "Durata densificazione bilanciata",
        "min": 0.6,
        "max": 0.9
      }
    }
  },
  
  // === PARAMETRI CALCOLATI ===
  "post_calculation": {
    "position_lr_final": {
      "formula": "position_lr_init / 100",
      "description": "Sempre 1/100 del lr_init"
    },
    "position_lr_max_steps": {
      "formula": "iterations",
      "description": "Sempre uguale alle iterazioni"
    },
    "densify_from_iter": {
      "formula": "max(500, iterations * 0.015)",
      "description": "Inizia densificazione ancora prima (~1.5%)"
    },
    "opacity_reset_interval": {
      "formula": "max(6000, iterations * 0.3)",
      "description": "Reset opacity molto meno frequente (~30%)"
    }
  },
  
  // === LIMITI HARDWARE ===
  "hardware_limits": {
    "estimated_gaussians_per_gb": 150000,
    "description": "Stima gaussiane per GB VRAM con MCMC"
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
      "rule": "densify_until_iter <= iterations * 0.8",
      "message": "densify_until_iter non può superare 80% delle iterazioni"
    },
    {
      "rule": "iterations >= 1000",
      "message": "Minimo 1000 iterazioni richieste"
    },
    {
      "rule": "cap_max >= 100000",
      "message": "cap_max deve essere almeno 100k gaussiane"
    },
    {
      "rule": "cap_max <= 5000000",
      "message": "cap_max non può superare 5M gaussiane"
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

// Verifica inserimento
db.training_params.findOne({
  "algorithm_name": "gaussian_splatting_mcmc",
  "active": true
});

console.log("\n=== FIX OPACITY - NUOVI VALORI ===");
console.log("STANDARD (opacity_lr CORRETTO):");
console.log("  - opacity_lr:", 0.08, "(era 0.03 - AUMENTATO per più opacità)");
console.log("  - opacity_reg:", 0.001, "(era 0.005 - RIDOTTO per meno regolarizzazione)");
console.log("  - opacity_reset_interval:", "ogni", Math.floor(30000 * 0.3), "iter (9k - meno frequente)");

console.log("\nHIGH (opacity ottimizzato):");
console.log("  - opacity_lr:", (0.08 * 1.15).toFixed(3), "(aumentato per più opacità)");
console.log("  - opacity_reg:", (0.001 * 0.70).toFixed(4), "(ridotto)");

console.log("\nULTRA (opacity massimizzato):");
console.log("  - opacity_lr:", (0.08 * 1.25).toFixed(2), "(massimo per opacità totale)");
console.log("  - opacity_reg:", (0.001 * 0.50).toFixed(4), "(minimo per zero trasparenze)");

console.log("\n✅ Configurazione MCMC con FIX OPACITY inserita!");
console.log("🎯 Opacity LR aumentato: 0.03 → 0.08 (per gaussiane più opache)");
console.log("🔧 Opacity reg ridotto: 0.005 → 0.001 (meno regolarizzazione)");
console.log("⏰ Reset opacity meno frequente per preservare opacità");
console.log("🚀 Ora dovrebbe avere molte meno trasparenze nel terreno!");